alter table public.orders
  add column if not exists razorpay_order_id text unique,
  add column if not exists razorpay_payment_id text unique;

create table if not exists public.checkout_payment_selections (
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkout_key uuid not null,
  payment_method text not null check (payment_method in ('Cash on Delivery', 'Razorpay')),
  created_at timestamptz not null default now(),
  primary key (user_id, checkout_key)
);
alter table public.checkout_payment_selections enable row level security;

insert into public.checkout_payment_selections (user_id, checkout_key, payment_method)
select user_id, checkout_key, payment_method
from public.orders
where user_id is not null
  and checkout_key is not null
  and payment_method in ('Cash on Delivery', 'Razorpay')
on conflict (user_id, checkout_key) do nothing;

create or replace function public.claim_checkout_payment_method(
  p_checkout_key uuid,
  p_payment_method text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_payment_method text;
begin
  if v_user_id is null or p_checkout_key is null
    or p_payment_method is null
    or p_payment_method not in ('Cash on Delivery', 'Razorpay')
  then
    raise exception using message = 'checkout_payment_method_invalid', errcode = 'P0001';
  end if;

  insert into public.checkout_payment_selections (user_id, checkout_key, payment_method)
  values (v_user_id, p_checkout_key, p_payment_method)
  on conflict (user_id, checkout_key) do nothing;

  select payment_method
    into v_payment_method
  from public.checkout_payment_selections
  where user_id = v_user_id
    and checkout_key = p_checkout_key
  for update;

  if v_payment_method is distinct from p_payment_method then
    raise exception using message = 'checkout_payment_method_mismatch', errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.create_cod_checkout_order(
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
begin
  perform public.claim_checkout_payment_method(p_checkout_key, 'Cash on Delivery');
  return public.create_checkout_order(
    p_items,
    p_customer_name,
    p_customer_phone,
    p_shipping_address,
    p_city,
    p_state,
    p_pincode,
    p_checkout_key
  );
end;
$$;

create or replace function public.create_razorpay_checkout_order(
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_shipping_address text,
  p_city text,
  p_state text,
  p_pincode text,
  p_checkout_key uuid
)
returns table (
  app_order_id uuid,
  app_order_number text,
  total_amount numeric,
  provider_order_id text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order_id uuid;
  v_order public.orders%rowtype;
begin
  perform public.claim_checkout_payment_method(p_checkout_key, 'Razorpay');

  v_order_id := public.create_checkout_order(
    p_items,
    p_customer_name,
    p_customer_phone,
    p_shipping_address,
    p_city,
    p_state,
    p_pincode,
    p_checkout_key
  );

  update public.orders
  set payment_method = 'Razorpay',
      payment_status = 'PAYMENT_PENDING'
  where id = v_order_id
    and user_id = (select auth.uid())
    and checkout_key = p_checkout_key
    and status = 'Processing'
    and payment_status = 'PAYMENT_PENDING'
    and payment_method = 'Cash on Delivery';

  select *
  into v_order
  from public.orders
  where id = v_order_id
    and user_id = (select auth.uid())
    and payment_method = 'Razorpay'
    and payment_status = 'PAYMENT_PENDING'
    and status = 'Processing';

  if not found then
    raise exception using message = 'razorpay_order_unavailable', errcode = 'P0001';
  end if;

  return query select v_order.id, v_order.order_number, v_order.total, v_order.razorpay_order_id;
end;
$$;

create or replace function public.attach_razorpay_order(
  p_app_order_id uuid,
  p_provider_order_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_provider_order_id is null or p_provider_order_id !~ '^order_[A-Za-z0-9]+$' then
    raise exception using message = 'razorpay_order_id_invalid', errcode = 'P0001';
  end if;

  update public.orders
  set razorpay_order_id = p_provider_order_id
  where id = p_app_order_id
    and user_id = (select auth.uid())
    and payment_method = 'Razorpay'
    and payment_status = 'PAYMENT_PENDING'
    and status = 'Processing'
    and (razorpay_order_id is null or razorpay_order_id = p_provider_order_id);

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.cancel_pending_razorpay_order(p_app_order_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.orders
  set status = 'Cancelled'
  where id = p_app_order_id
    and user_id = (select auth.uid())
    and payment_method = 'Razorpay'
    and payment_status = 'PAYMENT_PENDING'
    and status = 'Processing';

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.expire_pending_razorpay_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired integer;
begin
  update public.orders
  set status = 'Cancelled',
      updated_at = now()
  where payment_method = 'Razorpay'
    and payment_status = 'PAYMENT_PENDING'
    and status = 'Processing'
    and created_at < now() - interval '30 minutes';

  get diagnostics v_expired = row_count;
  return v_expired;
end;
$$;

create or replace function public.mark_razorpay_payment_paid(
  p_provider_order_id text,
  p_payment_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  if p_provider_order_id is null or p_payment_id is null
    or p_provider_order_id !~ '^order_[A-Za-z0-9]+$'
    or p_payment_id !~ '^pay_[A-Za-z0-9]+$'
  then
    raise exception using message = 'razorpay_payment_reference_invalid', errcode = 'P0001';
  end if;

  update public.orders
  set payment_status = 'PAID',
      razorpay_payment_id = p_payment_id,
      updated_at = now()
  where razorpay_order_id = p_provider_order_id
    and payment_method = 'Razorpay'
    and total > 0
    and status <> 'Cancelled'
    and (
      payment_status = 'PAYMENT_PENDING'
      or (payment_status = 'PAID' and razorpay_payment_id = p_payment_id)
    );

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

create or replace function public.flag_razorpay_refund_required(
  p_provider_order_id text,
  p_payment_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated integer;
begin
  update public.orders
  set payment_status = 'REFUND_REQUIRED',
      razorpay_payment_id = p_payment_id,
      updated_at = now()
  where razorpay_order_id = p_provider_order_id
    and payment_method = 'Razorpay'
    and status = 'Cancelled'
    and (
      payment_status in ('PAYMENT_PENDING', 'REFUND_REQUIRED')
      and (razorpay_payment_id is null or razorpay_payment_id = p_payment_id)
    );

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke all on function public.create_checkout_order(jsonb, text, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_checkout_payment_method(uuid, text) from public, anon;
revoke all on function public.create_cod_checkout_order(jsonb, text, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.create_razorpay_checkout_order(jsonb, text, text, text, text, text, text, uuid) from public, anon;
revoke all on function public.attach_razorpay_order(uuid, text) from public, anon;
revoke all on function public.cancel_pending_razorpay_order(uuid) from public, anon;
revoke all on function public.expire_pending_razorpay_orders() from public, anon, authenticated;
revoke all on function public.mark_razorpay_payment_paid(text, text) from public, anon, authenticated;
revoke all on function public.flag_razorpay_refund_required(text, text) from public, anon, authenticated;
grant execute on function public.create_cod_checkout_order(jsonb, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.create_razorpay_checkout_order(jsonb, text, text, text, text, text, text, uuid) to authenticated;
grant execute on function public.attach_razorpay_order(uuid, text) to authenticated;
grant execute on function public.cancel_pending_razorpay_order(uuid) to authenticated;
grant execute on function public.expire_pending_razorpay_orders() to service_role;
grant execute on function public.mark_razorpay_payment_paid(text, text) to service_role;
grant execute on function public.flag_razorpay_refund_required(text, text) to service_role;
