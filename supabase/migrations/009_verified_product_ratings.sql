create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

alter table public.product_reviews enable row level security;

create or replace function public.set_verified_product_review_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select oi.product_id, o.user_id
    into new.product_id, new.user_id
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where oi.id = new.order_item_id
    and o.status = 'Delivered'
    and oi.product_id is not null;

  if new.product_id is null or new.user_id is null then
    raise exception 'A rating can only be submitted for a delivered order item';
  end if;

  return new;
end;
$$;

create trigger product_reviews_set_verified_owner
  before insert on public.product_reviews
  for each row execute function public.set_verified_product_review_owner();

create or replace function public.refresh_product_review_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.products p
  set rating = stats.average_rating,
      review_count = stats.review_count
  from (
    select round(avg(pr.rating)::numeric, 2) as average_rating,
           count(*)::integer as review_count
    from public.product_reviews pr
    where pr.product_id = new.product_id
  ) stats
  where p.id = new.product_id;

  return new;
end;
$$;

create trigger product_reviews_refresh_rating
  after insert on public.product_reviews
  for each row execute function public.refresh_product_review_rating();

drop policy if exists "product_reviews_select_own_or_admin" on public.product_reviews;
create policy "product_reviews_select_own_or_admin"
  on public.product_reviews for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "product_reviews_insert_delivered_order_item" on public.product_reviews;
create policy "product_reviews_insert_delivered_order_item"
  on public.product_reviews for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.id = product_reviews.order_item_id
        and oi.product_id = product_reviews.product_id
        and o.user_id = (select auth.uid())
        and o.status = 'Delivered'
    )
  );

grant select, insert on public.product_reviews to authenticated;
revoke update, delete on public.product_reviews from anon, authenticated;
