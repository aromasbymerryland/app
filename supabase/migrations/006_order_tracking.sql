alter table public.orders
  add column if not exists tracking_url text;

alter table public.orders
  drop constraint if exists orders_tracking_url_https;

alter table public.orders
  add constraint orders_tracking_url_https
  check (
    tracking_url is null
    or (
      length(tracking_url) <= 2048
      and tracking_url ~ '^https://[^[:space:]]+$'
    )
  );
