alter table public.profiles enable row level security;

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, phone, address, city, state, pincode, updated_at)
  on public.profiles to authenticated;
