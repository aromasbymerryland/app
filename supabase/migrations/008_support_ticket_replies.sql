create table if not exists public.support_ticket_replies (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  admin_user_id uuid not null references public.profiles(id) on delete restrict,
  message text not null check (length(trim(message)) between 2 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_replies_ticket_created
  on public.support_ticket_replies(ticket_id, created_at);

alter table public.support_ticket_replies enable row level security;

drop policy if exists "support_ticket_replies_customer_read_own" on public.support_ticket_replies;
create policy "support_ticket_replies_customer_read_own"
  on public.support_ticket_replies for select to authenticated
  using (
    exists (
      select 1
      from public.support_tickets
      where support_tickets.id = support_ticket_replies.ticket_id
        and support_tickets.user_id = (select auth.uid())
    )
  );

drop policy if exists "support_ticket_replies_admin_read" on public.support_ticket_replies;
create policy "support_ticket_replies_admin_read"
  on public.support_ticket_replies for select to authenticated
  using ((select public.is_admin()));

drop policy if exists "support_ticket_replies_admin_insert" on public.support_ticket_replies;
create policy "support_ticket_replies_admin_insert"
  on public.support_ticket_replies for insert to authenticated
  with check (
    admin_user_id = (select auth.uid())
    and (select public.is_admin())
  );

grant select, insert on public.support_ticket_replies to authenticated;
revoke update, delete on public.support_ticket_replies from anon, authenticated;
