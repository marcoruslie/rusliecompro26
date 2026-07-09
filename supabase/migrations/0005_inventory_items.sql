-- Inventory core, slice 2: items catalog (raw materials + finished goods).
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,                                  -- soft delete: null = active
  sku text not null,
  name text not null,
  category text not null check (category in ('raw_material','finished_good')),
  unit text not null,                                      -- e.g. pcs, kg, m
  cost_price numeric not null default 0,
  sale_price numeric not null default 0,
  reorder_level numeric not null default 0,                -- low-stock threshold
  is_active boolean not null default true
);
create unique index if not exists items_sku_active_uq
  on public.items (lower(sku)) where deleted_at is null;
create index if not exists items_category_idx
  on public.items (category) where deleted_at is null;

alter table public.items enable row level security;
create policy "authenticated full access to items"
  on public.items for all to authenticated using (true) with check (true);
