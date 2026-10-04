create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (name, slug, sort_order)
values
  ('Car', 'car', 1),
  ('Everyday Spaces', 'everyday-spaces', 2),
  ('Spiritual', 'spiritual', 3),
  ('Home', 'home', 4)
on conflict (slug) do nothing;

alter table public.products
  add column if not exists category_id uuid references public.categories(id) on delete set null,
  add column if not exists is_featured boolean not null default false,
  add column if not exists is_published boolean not null default true;

create index if not exists products_published_category_created
  on public.products(is_published, category_id, created_at desc);

update public.products as product
set category_id = category.id
from public.categories as category
where product.category_id is null
  and lower(product.category) = lower(category.name);

drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.update_updated_at_column();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  storage_path text,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists product_images_one_primary_per_product
  on public.product_images(product_id)
  where is_primary;

create table if not exists public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  feature text not null,
  sort_order integer not null default 0,
  unique (product_id, feature)
);

insert into public.product_features (product_id, feature, sort_order)
select product.id, feature.value, feature.ordinality::integer - 1
from public.products as product
cross join lateral unnest(coalesce(product.features, '{}'::text[]))
  with ordinality as feature(value, ordinality)
on conflict (product_id, feature) do nothing;

create table if not exists public.product_fragrance_notes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  note text not null,
  note_type text not null check (note_type in ('top', 'heart', 'base')),
  sort_order integer not null default 0,
  unique (product_id, note, note_type, sort_order)
);

insert into public.product_fragrance_notes (product_id, note, note_type, sort_order)
select product.id, note.value, notes.note_type, note.ordinality::integer - 1
from public.products as product
cross join lateral (
  values
    ('top', coalesce(product.fragrance_notes->'top', '[]'::jsonb)),
    ('heart', coalesce(product.fragrance_notes->'heart', '[]'::jsonb)),
    ('base', coalesce(product.fragrance_notes->'base', '[]'::jsonb))
) as notes(note_type, note_values)
cross join lateral jsonb_array_elements_text(notes.note_values)
  with ordinality as note(value, ordinality)
on conflict (product_id, note, note_type, sort_order) do nothing;

alter table public.categories enable row level security;
alter table public.product_images enable row level security;
alter table public.product_features enable row level security;
alter table public.product_fragrance_notes enable row level security;

drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active"
  on public.categories for select to anon, authenticated
  using (is_active);
drop policy if exists "categories_admin_manage" on public.categories;
create policy "categories_admin_manage"
  on public.categories for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "product_images_public_read" on public.product_images;
create policy "product_images_public_read"
  on public.product_images for select to anon, authenticated
  using (true);
drop policy if exists "product_images_admin_manage" on public.product_images;
create policy "product_images_admin_manage"
  on public.product_images for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "product_features_public_read" on public.product_features;
create policy "product_features_public_read"
  on public.product_features for select to anon, authenticated
  using (true);
drop policy if exists "product_features_admin_manage" on public.product_features;
create policy "product_features_admin_manage"
  on public.product_features for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "product_notes_public_read" on public.product_fragrance_notes;
create policy "product_notes_public_read"
  on public.product_fragrance_notes for select to anon, authenticated
  using (true);
drop policy if exists "product_notes_admin_manage" on public.product_fragrance_notes;
create policy "product_notes_admin_manage"
  on public.product_fragrance_notes for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select on public.categories, public.product_images, public.product_features,
  public.product_fragrance_notes to anon, authenticated;
grant insert, update, delete on public.categories, public.product_images,
  public.product_features, public.product_fragrance_notes to authenticated;

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "product_bucket_public_read" on storage.objects;
create policy "product_bucket_public_read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'products');
drop policy if exists "product_bucket_admin_upload" on storage.objects;
create policy "product_bucket_admin_upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'products' and (select public.is_admin()));
drop policy if exists "product_bucket_admin_update" on storage.objects;
create policy "product_bucket_admin_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'products' and (select public.is_admin()))
  with check (bucket_id = 'products' and (select public.is_admin()));
drop policy if exists "product_bucket_admin_delete" on storage.objects;
create policy "product_bucket_admin_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'products' and (select public.is_admin()));
