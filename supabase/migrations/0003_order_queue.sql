-- Order queue: status + single image per transaction
alter table public.transactions
  add column if not exists status text not null default 'processing'
    check (status in ('processing','completed')),
  add column if not exists image_drive_id text,
  add column if not exists image_name text;

create index if not exists transactions_status_idx on public.transactions (status);

-- Single-row store for the Google OAuth connection (server-side secrets)
create table if not exists public.google_oauth (
  id int primary key default 1 check (id = 1),
  created_at timestamptz not null default now(),
  refresh_token text,
  access_token text,
  token_expiry timestamptz,
  drive_folder_id text
);

alter table public.google_oauth enable row level security;

create policy "authenticated full access to google_oauth"
  on public.google_oauth for all
  to authenticated using (true) with check (true);
