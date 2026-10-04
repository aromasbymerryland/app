create extension if not exists "uuid-ossp";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  phone text,
  address text,
  city text,
  state text,
  pincode text,
  role text default 'customer' check (role in ('customer', 'admin')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.products (
  id uuid default gen_random_uuid() primary key,
  slug text unique not null,
  name text not null,
  category text not null check (category in ('Car', 'Everyday Spaces', 'Spiritual', 'Home')),
  category_slug text not null,
  fragrance_family text not null,
  price numeric(10, 2) not null,
  original_price numeric(10, 2),
  discount text,
  rating numeric(3, 2) default 5.0,
  review_count integer default 0,
  type text default 'reed-diffuser' check (type in ('car-gem', 'reed-diffuser', 'spiritual')),
  color_primary text default '#5c0628',
  color_secondary text default '#21010d',
  badge text,
  short_description text not null,
  full_description text not null,
  features text[] default '{}',
  fragrance_notes jsonb default '{"top": [], "heart": [], "base": []}'::jsonb,
  intensity integer default 4 check (intensity between 1 and 5),
  size text not null,
  in_stock boolean default true,
  stock_quantity integer default 50,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  store_name text default 'Aromas by Merryland',
  announcement_bar text default 'Made in India • 0% Alcohol • IFRA Certified Fragrances | Free Shipping above ₹1,499',
  contact_email text default 'Merryland.mathura@gmail.com',
  contact_phone text default '+91 9837349067',
  free_shipping_threshold numeric(10, 2) default 1499.00,
  offers jsonb default '[
    {"code": "FESTIVE20", "title": "20% OFF Site-wide", "min_spend": 999, "active": true},
    {"code": "PURESOUL", "title": "Free Dhoop Stand with Spiritual Cones", "min_spend": 599, "active": true}
  ]'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.orders (
  id uuid default gen_random_uuid() primary key,
  order_number text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  shipping_address text not null,
  city text not null,
  state text not null,
  pincode text not null,
  subtotal numeric(10, 2) not null,
  shipping_fee numeric(10, 2) default 0.00,
  total numeric(10, 2) not null,
  payment_method text not null,
  status text default 'Processing' check (status in ('Processing', 'Shipped', 'Delivered', 'Cancelled')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price numeric(10, 2) not null,
  quantity integer not null,
  total_price numeric(10, 2) not null
);

insert into public.site_settings (id, store_name, announcement_bar)
values (1, 'Aromas by Merryland', 'Made in India • 0% Alcohol • IFRA Certified Fragrances')
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.site_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "Allow public read on products"
  on public.products for select using (true);
create policy "Allow public read on site_settings"
  on public.site_settings for select using (true);

create policy "Allow admins full access on products"
  on public.products for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));
create policy "Allow admins full access on site_settings"
  on public.site_settings for all
  using (exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', 'customer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into public.profiles (id, full_name, role)
select id, raw_user_meta_data->>'full_name', 'customer'
from auth.users
on conflict (id) do nothing;
