-- Inventory core, slice 1: warehouses + storage locations.
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,                         -- soft delete: null = active
  code text not null,
  name text not null,
  address text,
  is_active boolean not null default true
);
create unique index if not exists warehouses_code_active_uq
  on public.warehouses (lower(code)) where deleted_at is null;

create table if not exists public.storage_locations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  warehouse_id uuid not null references public.warehouses(id),
  code text not null,
  name text,
  is_active boolean not null default true
);
create unique index if not exists storage_locations_code_active_uq
  on public.storage_locations (warehouse_id, lower(code)) where deleted_at is null;
create index if not exists storage_locations_warehouse_idx
  on public.storage_locations (warehouse_id) where deleted_at is null;

alter table public.warehouses enable row level security;
alter table public.storage_locations enable row level security;

create policy "authenticated full access to warehouses"
  on public.warehouses for all to authenticated using (true) with check (true);
create policy "authenticated full access to storage_locations"
  on public.storage_locations for all to authenticated using (true) with check (true);
