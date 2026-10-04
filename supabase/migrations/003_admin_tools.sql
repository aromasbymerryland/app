create table if not exists public.admin_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_logs enable row level security;
drop policy if exists "admin_logs_admin_read" on public.admin_logs;
create policy "admin_logs_admin_read"
  on public.admin_logs for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "admin_logs_admin_insert" on public.admin_logs;
create policy "admin_logs_admin_insert"
  on public.admin_logs for insert to authenticated
  with check (
    admin_user_id = (select auth.uid())
    and (select public.is_admin())
  );
grant select, insert on public.admin_logs to authenticated;
revoke update, delete on public.admin_logs from anon, authenticated;

create or replace function public.admin_revenue_total()
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(sum(total), 0)
  from public.orders
  where public.is_admin()
    and status <> 'Cancelled'
    and (
      payment_status = 'PAID'
      or (payment_method = 'Cash on Delivery' and status = 'Delivered')
    );
$$;

revoke all on function public.admin_revenue_total() from public, anon;
grant execute on function public.admin_revenue_total() to authenticated;

drop policy if exists "products_admin_manage" on public.products;
create policy "products_admin_manage"
  on public.products for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "site_settings_admin_manage" on public.site_settings;
create policy "site_settings_admin_manage"
  on public.site_settings for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update, delete on public.products, public.site_settings to authenticated;
grant select on public.orders, public.order_items, public.profiles to authenticated;
