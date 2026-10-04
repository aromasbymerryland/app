alter table public.orders
  add column if not exists customer_email text,
  add column if not exists payment_status text not null default 'PAYMENT_PENDING',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists stock_reserved boolean not null default false,
  add column if not exists inventory_restored_at timestamptz,
  add column if not exists checkout_key uuid;

alter table public.site_settings
  add column if not exists shipping_fee numeric(10, 2) not null default 99.00;

alter table public.order_items
  add column if not exists product_slug text,
  add column if not exists product_snapshot jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_price_nonnegative' and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_price_nonnegative check (price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_original_price_nonnegative' and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_original_price_nonnegative check (original_price is null or original_price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_stock_nonnegative' and conrelid = 'public.products'::regclass) then
    alter table public.products add constraint products_stock_nonnegative check (stock_quantity >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'orders_amounts_nonnegative' and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_amounts_nonnegative check (subtotal >= 0 and shipping_fee >= 0 and total >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_quantity_positive' and conrelid = 'public.order_items'::regclass) then
    alter table public.order_items add constraint order_items_quantity_positive check (quantity > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'order_items_amounts_nonnegative' and conrelid = 'public.order_items'::regclass) then
    alter table public.order_items add constraint order_items_amounts_nonnegative check (unit_price >= 0 and total_price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'site_settings_shipping_nonnegative' and conrelid = 'public.site_settings'::regclass) then
    alter table public.site_settings add constraint site_settings_shipping_nonnegative check (shipping_fee >= 0 and free_shipping_threshold >= 0);
  end if;
end;
$$;

create unique index if not exists orders_user_checkout_key
  on public.orders(user_id, checkout_key)
  where checkout_key is not null;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
  before update on public.products
  for each row execute function public.update_updated_at_column();

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
  before update on public.site_settings
  for each row execute function public.update_updated_at_column();

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.update_updated_at_column();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, address, city, state, pincode, updated_at)
  on public.profiles to authenticated;

drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "orders_admin_update" on public.orders;
create policy "orders_admin_update"
  on public.orders for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, update on public.orders to authenticated;
revoke insert, delete on public.orders from anon, authenticated;

drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin"
  on public.order_items for select to authenticated
  using (
    exists (
      select 1
      from public.orders
      where orders.id = order_items.order_id
        and (
          orders.user_id = (select auth.uid())
          or (select public.is_admin())
        )
    )
  );

grant select on public.order_items to authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

create or replace function public.restore_cancelled_order_inventory()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'Processing'
    and new.status = 'Cancelled'
    and new.stock_reserved
    and new.inventory_restored_at is null
  then
    update public.products as product
    set stock_quantity = product.stock_quantity + restock.quantity,
        in_stock = true
    from (
      select product_id, sum(quantity)::integer as quantity
      from public.order_items
      where order_id = new.id
        and product_id is not null
      group by product_id
    ) as restock
    where product.id = restock.product_id;
    update public.orders
    set stock_reserved = false,
        inventory_restored_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists restore_inventory_after_order_cancellation on public.orders;
create trigger restore_inventory_after_order_cancellation
  after update of status on public.orders
  for each row
  execute function public.restore_cancelled_order_inventory();

create or replace function public.create_checkout_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_checkout_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_line record;
  v_product public.products%rowtype;
  v_order_id uuid;
  v_order_number text;
  v_order_items jsonb := '[]'::jsonb;
  v_subtotal numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
  v_threshold numeric(10, 2);
  v_item_count integer;
begin
  if v_user_id is null then
    raise exception using message = 'authentication_required', errcode = 'P0001';
  end if;
  if p_checkout_key is null then
    raise exception using message = 'checkout_key_invalid', errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_user_id::text || p_checkout_key::text, 0));
  select id
  into v_order_id
  from public.orders
  where user_id = v_user_id
    and checkout_key = p_checkout_key;
  if found then
    return v_order_id;
  end if;

  if p_items is null or jsonb_typeof(p_items) is distinct from 'array' then
    raise exception using message = 'cart_invalid', errcode = 'P0001';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 25 then
    raise exception using message = 'cart_invalid', errcode = 'P0001';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    where coalesce(item.value->>'product_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or coalesce(item.value->>'quantity', '') !~ '^[1-9][0-9]*$'
      or (item.value->>'quantity')::integer > 10
  ) then
    raise exception using message = 'cart_invalid', errcode = 'P0001';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    group by (item.value->>'product_id')::uuid
    having sum((item.value->>'quantity')::integer) > 10
  ) then
    raise exception using message = 'cart_invalid', errcode = 'P0001';
  end if;
  if length(trim(coalesce(p_customer_name, ''))) not between 2 and 100
    or coalesce(p_customer_phone, '') !~ '^[0-9+() -]{7,20}$'
    or length(trim(coalesce(p_shipping_address, ''))) not between 8 and 500
    or length(trim(coalesce(p_city, ''))) not between 2 and 100
    or length(trim(coalesce(p_state, ''))) not between 2 and 100
    or coalesce(p_pincode, '') !~ '^[0-9]{6}$'
  then
    raise exception using message = 'address_invalid', errcode = 'P0001';
  end if;

  for v_line in
    select
      (item.value->>'product_id')::uuid as product_id,
      sum((item.value->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by (item.value->>'product_id')::uuid
    order by (item.value->>'product_id')::uuid
  loop
    select *
    into v_product
    from public.products
    where id = v_line.product_id
    for update;

    if not found or not coalesce(v_product.in_stock, false)
      or coalesce(v_product.stock_quantity, 0) < v_line.quantity
    then
      raise exception using message = 'stock_unavailable', errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + v_product.price * v_line.quantity;
    v_order_items := v_order_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'product_slug', v_product.slug,
      'unit_price', v_product.price,
      'quantity', v_line.quantity,
      'total_price', v_product.price * v_line.quantity,
      'product_snapshot', jsonb_build_object(
        'name', v_product.name,
        'slug', v_product.slug,
        'category', v_product.category,
        'fragrance_family', v_product.fragrance_family,
        'type', v_product.type,
        'size', v_product.size
      )
    ));
  end loop;

  select coalesce(free_shipping_threshold, 1499), coalesce(shipping_fee, 99)
  into v_threshold, v_shipping
  from public.site_settings
  where id = 1;
  v_threshold := coalesce(v_threshold, 1499);
  v_shipping := case when v_subtotal >= v_threshold then 0 else coalesce(v_shipping, 99) end;
  v_order_number := 'ML-' || upper(substr(replace(pg_catalog.gen_random_uuid()::text, '-', ''), 1, 12));

  insert into public.orders (
    order_number, user_id, customer_name, customer_email, customer_phone,
    shipping_address, city, state, pincode, subtotal, shipping_fee, total,
    payment_method, payment_status, status, stock_reserved, checkout_key
  )
  values (
    v_order_number, v_user_id,
    trim(p_customer_name),
    (select email from auth.users where id = v_user_id),
    trim(p_customer_phone),
    trim(p_shipping_address),
    trim(p_city),
    trim(p_state),
    trim(p_pincode),
    v_subtotal,
    v_shipping,
    v_subtotal + v_shipping,
    'Cash on Delivery',
    'PAYMENT_PENDING',
    'Processing',
    true,
    p_checkout_key
  )
  returning id into v_order_id;

  for v_line in
    select *
    from jsonb_to_recordset(v_order_items) as item(
      product_id uuid,
      product_name text,
      product_slug text,
      unit_price numeric,
      quantity integer,
      total_price numeric,
      product_snapshot jsonb
    )
  loop
    update public.products
    set stock_quantity = stock_quantity - v_line.quantity,
        in_stock = stock_quantity - v_line.quantity > 0,
        updated_at = now()
    where id = v_line.product_id;

    insert into public.order_items (
      order_id, product_id, product_name, product_slug, unit_price, quantity,
      total_price, product_snapshot
    )
    values (
      v_order_id, v_line.product_id, v_line.product_name, v_line.product_slug,
      v_line.unit_price, v_line.quantity, v_line.total_price, v_line.product_snapshot
    );
  end loop;

  return v_order_id;
end;
$$;

revoke all on function public.create_checkout_order(jsonb, text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.create_checkout_order(jsonb, text, text, text, text, text, text, uuid) to authenticated;
