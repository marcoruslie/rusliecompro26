# Inventory Core — Slice 2: Items (Products + Raw Materials)

**Date:** 2026-06-29
**Status:** Approved (pending spec review)
**Part of:** ERP expansion → Inventory core → Slice 2 (after Warehouses + Storage Locations).

## Context

Lightweight ERP on the existing **Supabase (PostgreSQL) + Supabase Auth** stack
(NOT Prisma/MySQL/NextAuth). RBAC is `admin | viewer` via `roleFromUser`;
viewers are confined to the Queue. Slice 1 established the `lib/inventory/`
domain folder, the `deleted_at` soft-delete convention, and the
warehouses/locations CRUD pattern. This slice adds the **Items catalog**.

### Key decision: relationship to the existing `wires` table

The existing `wires` table already functions as the **sales line-item catalog**
— `components/TransactionForm.tsx` requires selecting a wire for every invoice
line item. The ERP Items catalog overlaps with it.

**Decision (approved):** build `items` as a **new, separate canonical ERP
catalog** now. Leave `wires` and `TransactionForm` **untouched** this slice. A
later dedicated slice will unify `wires → items` and rewire sales. This keeps
the slice isolated with zero risk to working invoicing.

## Goals

- An `items` master catalog (raw materials + finished goods) with full CRUD,
  search, category filter, sort, soft delete, and empty/loading/error states.
- Admin-only, integrated seamlessly with existing conventions.

## Approved decisions

1. **Separate new `items` table**; defer wires unification (above).
2. **On-hand stock is derived from the future stock ledger** — the `items`
   table stores master data + a `reorder_level` threshold only, **no quantity
   column**.
3. **Reusable `<MasterTable>`/`<MasterForm>` extraction is deferred** to its own
   later refactor slice; this slice follows the existing inline-page style.
4. **Full field set including `sale_price`.**

## Non-Goals (deferred to later slices)

On-hand quantity / stock ledger / low-stock alerts; reusable-component
extraction; wires→items unification and sales rewiring; export Excel/PDF, print,
activity log, column visibility, bulk actions, server-side pagination, dark
mode. No delete guard this slice (nothing references `items` yet; the ledger
slice adds one when stock movements exist).

## Conventions to follow

Mirror the slice-1 warehouses module: SQL migration → `lib/inventory/items.ts`
data functions → server page (auth + admin role check) → `"use client"`
`ItemsClient` with optimistic state and an inline add/edit form. `.admin-*`
classes, lucide icons, `confirm()` delete, Indonesian copy, `createClient()`
from `@/lib/supabase/client`.

## Data model

New migration: `supabase/migrations/0005_inventory_items.sql`

```sql
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
```

Notes:
- `numeric` for `cost_price` / `sale_price` / `reorder_level` (money + fractional
  units like kg/m).
- `sku` unique among active rows, case-insensitive (`lower(sku)`).
- No quantity column (on-hand derived from the ledger later).

## Types (`lib/types.ts` additions)

```ts
export type ItemCategory = "raw_material" | "finished_good";

export interface Item {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  sku: string;
  name: string;
  category: ItemCategory;
  unit: string;
  cost_price: number;
  sale_price: number;
  reorder_level: number;
  is_active: boolean;
}
```

## Data layer — `lib/inventory/items.ts`

- `type ItemInput = Omit<Item, "id" | "created_at" | "deleted_at">`
- `listItems(supabase): Promise<Item[]>` — `deleted_at is null`, order by `sku` asc.
- `createItem(supabase, data: ItemInput): Promise<Item>`
- `updateItem(supabase, id: string, data: ItemInput): Promise<Item>`
- `softDeleteItem(supabase, id: string): Promise<void>` — sets `deleted_at = now()`.

Same shape/error handling as `lib/inventory/warehouses.ts`.

## Page & UI

- **`app/admin/items/page.tsx`** (server): `getUser()`; no user → `redirect("/admin")`;
  `roleFromUser(user) !== "admin"` → `redirect("/admin/queue")`; then
  `listItems` and render `ItemsClient`.
- **`components/ItemsClient.tsx`** (`"use client"`), mirroring `WarehousesClient`:
  - Inline add/edit form fields: **sku** (required), **name** (required),
    **category** (select: Raw Material / Finished Good; default raw_material),
    **unit** (required, text e.g. pcs/kg/m), **cost_price**, **sale_price**,
    **reorder_level**, **is_active** (checkbox, default true).
  - Number fields (`cost_price`, `sale_price`, `reorder_level`) are held as
    strings in form state and parsed on save with `Number(...)`; invalid or
    negative values are rejected with an inline message; blank → `0`.
  - List columns: SKU, Name, Category, Unit, Cost, Sale, Reorder, Status.
    Category shown as a plain Indonesian text label ("Bahan Baku" for
    raw_material, "Barang Jadi" for finished_good) — NOT a colored badge, to
    avoid confusion with the Active/inactive badge. `cost_price`/`sale_price`
    displayed with a local `rupiah()` helper
    (`"Rp" + n.toLocaleString("id-ID")`). Reorder shown as number + unit.
  - **Search** (sku/name), **category filter** (All / Raw Material / Finished
    Good), sort by sku.
  - Empty state distinguishes no-data ("Belum ada item.") from search/filter
    miss ("Tidak ada hasil pencarian."). Loading spinners on save/delete; inline
    error banner. Soft delete via `confirm()`.
  - Duplicate SKU (`23505`) → "SKU sudah dipakai."
  - Active/inactive uses the same Aktif/Nonaktif `.admin-badge-green` /
    `.admin-badge-gray` badges as slice 1.

## Navigation

Add an **Items** entry to `components/AdminNav.tsx` (`AdminPage` key `"items"`,
lucide `Package`), placed after Wires in the admin link set.

## Error handling

- Data-layer functions throw on Supabase error; client catches → inline
  Indonesian error banner.
- Duplicate SKU → "SKU sudah dipakai."
- Invalid number input → "Harga/jumlah harus angka ≥ 0."

## Testing / verification

No automated test suite (per CLAUDE.md). Verify with `npm run lint` +
`npm run build`, plus manual checks:
1. User applies `0005_inventory_items.sql` in Supabase; confirm table, indexes,
   RLS policy.
2. As admin at `/admin/items`: create items of each category; cost/sale render
   as Rupiah; reorder shows with unit.
3. Duplicate SKU (case-insensitive) blocked with "SKU sudah dipakai.";
   reusing a soft-deleted SKU succeeds (partial unique index).
4. Invalid number (letters / negative) rejected.
5. Search + category filter + sort behave; empty vs no-results messages correct.
6. Soft delete removes the row from the list and sets `deleted_at` in the DB.
7. As viewer: `/admin/items` redirects to `/admin/queue`.

## Git

The assistant runs no git commands (project rule — user commits manually). The
user applies the migration in Supabase.
