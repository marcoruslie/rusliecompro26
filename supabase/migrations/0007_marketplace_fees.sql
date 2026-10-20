-- Marketplace (Shopee) seller fees. Rates are editable in /admin/marketplace-fees
-- because Shopee changes them often. Percentages are stored as plain numbers
-- (8.25 = 8.25%); order_fee is a flat rupiah amount per order.
create table if not exists public.marketplace_fee_settings (
  marketplace text primary key,                   -- 'shopee'
  updated_at timestamptz not null default now(),
  admin_fee_pct numeric not null default 0,       -- Biaya Administrasi (per category)
  ongkir_xtra_pct numeric not null default 0,     -- Gratis Ongkir XTRA (0 if not joined)
  promo_xtra_pct numeric not null default 0,      -- Promo XTRA (0 if not joined)
  order_fee numeric not null default 0,           -- Biaya Proses Pesanan, per order
  pph22_pct numeric not null default 0            -- PPh 22 withheld by the marketplace
);

-- Estimated Shopee Non-Star rates as of Oct 2026. Check the admin fee for your
-- product category in Seller Centre and adjust in the admin page.
insert into public.marketplace_fee_settings
  (marketplace, admin_fee_pct, ongkir_xtra_pct, promo_xtra_pct, order_fee, pph22_pct)
values ('shopee', 8.25, 4, 4.5, 1250, 0.5)
on conflict (marketplace) do nothing;

alter table public.marketplace_fee_settings enable row level security;
create policy "authenticated full access to marketplace_fee_settings"
  on public.marketplace_fee_settings for all to authenticated using (true) with check (true);

-- Each transaction snapshots the fees deducted at save time, so changing the
-- rates later never rewrites old transactions. `total` stays the gross amount
-- the buyer paid; net received = total - marketplace_fee.
alter table public.transactions
  add column if not exists marketplace_fee numeric not null default 0,
  add column if not exists marketplace_fees jsonb;

-- Public invoice lookup: also hide the internal marketplace fee data
-- (otherwise identical to 0006).
create or replace function public.get_public_invoice(p_id uuid, p_last4 text)
returns setof public.transactions
language sql
stable
security definer
set search_path = public
as $$
  select (jsonb_populate_record(
    null::public.transactions,
    (to_jsonb(t) - 'marketplace_fees') || jsonb_build_object(
      'marketplace_fee', 0,
      'items',
      coalesce(
        (select jsonb_agg(e.item - 'employee_id' - 'employee_name' - 'commission_per_pcs' order by e.n)
           from jsonb_array_elements(t.items) with ordinality as e(item, n)),
        '[]'::jsonb
      )
    )
  )).*
  from public.transactions t
  where t.id = p_id
    and right(regexp_replace(coalesce(t.customer->>'phone', ''), '\D', '', 'g'), 4) = p_last4
    and length(p_last4) = 4;
$$;

revoke all on function public.get_public_invoice(uuid, text) from public;
grant execute on function public.get_public_invoice(uuid, text) to anon, authenticated;
