alter table public.site_settings
  add column if not exists invoice_legal_name text,
  add column if not exists invoice_address text,
  add column if not exists invoice_gstin text,
  add column if not exists invoice_state text,
  add column if not exists invoice_gst_rate numeric(5, 2) not null default 0,
  add column if not exists invoice_tax_mode text not null default 'inclusive';

alter table public.orders
  add column if not exists invoice_seller_name text,
  add column if not exists invoice_seller_address text,
  add column if not exists invoice_seller_gstin text,
  add column if not exists invoice_seller_state text,
  add column if not exists invoice_gst_rate numeric(5, 2) not null default 0,
  add column if not exists invoice_tax_inclusive boolean not null default true,
  add column if not exists invoice_tax_amount numeric(10, 2) not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_settings_invoice_gst_rate_valid'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_invoice_gst_rate_valid
      check (invoice_gst_rate between 0 and 100);
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'site_settings_invoice_tax_mode_valid'
      and conrelid = 'public.site_settings'::regclass
  ) then
    alter table public.site_settings
      add constraint site_settings_invoice_tax_mode_valid
      check (invoice_tax_mode in ('inclusive', 'exclusive'));
  end if;
end;
$$;

create or replace function public.snapshot_order_invoice_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.site_settings%rowtype;
begin
  select *
  into v_settings
  from public.site_settings
  where id = 1;

  if found then
    new.invoice_seller_name := v_settings.invoice_legal_name;
    new.invoice_seller_address := v_settings.invoice_address;
    new.invoice_seller_gstin := v_settings.invoice_gstin;
    new.invoice_seller_state := v_settings.invoice_state;
    new.invoice_gst_rate := coalesce(v_settings.invoice_gst_rate, 0);
    new.invoice_tax_inclusive := coalesce(v_settings.invoice_tax_mode, 'inclusive') = 'inclusive';

    if new.invoice_gst_rate > 0 then
      if length(trim(coalesce(new.invoice_seller_name, ''))) < 2
        or length(trim(coalesce(new.invoice_seller_address, ''))) < 8
        or trim(coalesce(new.invoice_seller_state, '')) = ''
        or coalesce(new.invoice_seller_gstin, '') !~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]Z[A-Z0-9]$'
      then
        raise exception using message = 'invoice_tax_configuration_invalid', errcode = 'P0001';
      end if;

      if new.invoice_tax_inclusive then
        new.invoice_tax_amount := round(new.subtotal * new.invoice_gst_rate / (100 + new.invoice_gst_rate), 2);
      else
        new.invoice_tax_amount := round(new.subtotal * new.invoice_gst_rate / 100, 2);
        new.total := new.subtotal + new.shipping_fee + new.invoice_tax_amount;
      end if;
    else
      new.invoice_tax_amount := 0;
    end if;
  end if;

  return new;
end;
$$;
revoke all on function public.snapshot_order_invoice_settings() from public, anon, authenticated;

drop trigger if exists snapshot_order_invoice_settings_before_insert on public.orders;
create trigger snapshot_order_invoice_settings_before_insert
  before insert on public.orders
  for each row execute function public.snapshot_order_invoice_settings();
