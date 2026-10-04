create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  customer_email text not null,
  subject text not null check (length(trim(subject)) between 4 and 160),
  category text not null check (category in ('Order', 'Delivery', 'Product', 'Payment', 'Account', 'Other')),
  message text not null check (length(trim(message)) between 15 and 5000),
  status text not null default 'Open' check (status in ('Open', 'In progress', 'Resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_created_at
  on public.support_tickets(created_at desc);
create index if not exists support_tickets_user_created_at
  on public.support_tickets(user_id, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_customer_read_own" on public.support_tickets;
create policy "support_tickets_customer_read_own"
  on public.support_tickets for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "support_tickets_customer_create_own" on public.support_tickets;
create policy "support_tickets_customer_create_own"
  on public.support_tickets for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and customer_email = (select auth.jwt()->>'email')
    and status = 'Open'
  );

drop policy if exists "support_tickets_admin_read" on public.support_tickets;
create policy "support_tickets_admin_read"
  on public.support_tickets for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "support_tickets_admin_update" on public.support_tickets;
create policy "support_tickets_admin_update"
  on public.support_tickets for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.support_tickets to authenticated;
revoke delete on public.support_tickets from anon, authenticated;

drop trigger if exists support_tickets_updated_at on public.support_tickets;
create trigger support_tickets_updated_at
  before update on public.support_tickets
  for each row execute function public.update_updated_at_column();
