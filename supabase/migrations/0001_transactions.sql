-- Customers directory
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  address text,
  city text,
  phone text
);

-- Wire types (editable; seeded with SUS304 and BAJA)
create table if not exists public.wire_types (
  type_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null unique
);

insert into public.wire_types (name)
values ('SUS304'), ('BAJA')
on conflict (name) do nothing;

-- Wire catalog
create table if not exists public.wires (
  wire_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  type_id uuid references public.wire_types(type_id) on delete set null
);

-- Recorded transactions (full invoice snapshot)
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_date text,
  invoice_number text,
  channel text not null check (channel in ('online','direct')),
  customer_id uuid references public.customers(id) on delete set null,
  customer jsonb not null,
  items jsonb not null,
  shipping numeric not null default 0,
  payment_method text not null check (payment_method in ('cash','top')),
  top_note text,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  sender_name text
);

create index if not exists transactions_created_at_idx on public.transactions (created_at desc);

-- Row Level Security: authenticated users only
alter table public.customers enable row level security;
alter table public.transactions enable row level security;
alter table public.wire_types enable row level security;
alter table public.wires enable row level security;

create policy "authenticated full access to customers"
  on public.customers for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to transactions"
  on public.transactions for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to wire_types"
  on public.wire_types for all
  to authenticated using (true) with check (true);

create policy "authenticated full access to wires"
  on public.wires for all
  to authenticated using (true) with check (true);
