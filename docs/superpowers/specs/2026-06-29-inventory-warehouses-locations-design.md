# Inventory Core — Slice 1: Warehouses + Storage Locations

**Date:** 2026-06-29
**Status:** Approved (pending spec review)
**Part of:** Lightweight ERP expansion → Inventory core module → Slice 1 of N.

## Context

The app is being extended into a lightweight ERP on its **existing stack** —
Next.js 14 App Router, React 18, TypeScript, Tailwind, **Supabase (PostgreSQL)
+ Supabase Auth** (NOT Prisma/MySQL/NextAuth, despite the original ERP prompt's
wording). RBAC is `admin | viewer` via `roleFromUser` (`lib/auth.ts`); viewers
are confined to the Queue.

Inventory core is several slices; build order is **Warehouses → Storage
Locations → Items → Stock Movements (ledger) → Stock Card / valuation**. This
spec covers only the first slice: **Warehouses + Storage Locations**, at a
"pragmatic baseline" feature level. Each later slice gets its own spec → plan →
implementation cycle and its own review.

## Goals

- Two master-data entities (Warehouses, Storage Locations) with full CRUD,
  search, sort, soft delete, and empty/loading/error states.
- Establish the ERP-wide **soft-delete convention** (`deleted_at`) and a
  `lib/inventory/` domain folder.
- Integrate seamlessly with existing conventions — no new libraries, no rewrite.

## Non-Goals (deferred to later slices/passes)

Export Excel/PDF, print, activity log, column visibility, bulk actions,
server-side pagination, dark mode, the full collapsible ERP sidebar redesign,
and the stock ledger / valuation / low-stock features. Reusable
`<DataTable>`/`<Form>`/`<Modal>` component extraction is also deferred (see
"Reusable components").

## Conventions to follow (from the existing codebase)

Mirror the **wires** module precisely:
- **Migration:** plain SQL in `supabase/migrations/NNNN_*.sql`, `create table if
  not exists`, RLS enabled with the standard `authenticated` full-access policy.
  Role enforcement lives in app code, not the DB.
- **Data layer:** `lib/<domain>/<entity>.ts` exporting `list / create / update /
  softDelete` functions that take a `SupabaseClient`, throw on error, return
  typed rows. Types in `lib/types.ts`.
- **Page:** server component does auth check + `Promise.all` fetch, renders a
  `"use client"` `<XClient>`.
- **Client:** holds initial data in state, optimistic updates, `createClient()`
  from `lib/supabase/client`, inline add/edit forms (not modals), `.admin-*`
  classes, lucide icons, `confirm()` for delete, Indonesian copy.
- **Access:** admin-only. The page redirects non-admins (viewers) away.

## Data model

New migration: `supabase/migrations/0004_inventory_warehouses.sql`

```sql
create table if not exists public.warehouses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,                         -- soft delete: null = active
  code text not null,                             -- short ref, e.g. "WH-01"
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
  code text not null,                             -- e.g. "A-01-03"
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
```

### Design decisions (approved)

1. **Soft delete via `deleted_at`** (null = active). List queries filter
   `deleted_at is null`; "delete" sets `deleted_at = now()`. This is the
   ERP-wide convention going forward.
2. **`code` field** on both entities — human reference needed later for stock
   movements and document numbering. Unique among *active* rows,
   case-insensitive (`lower(code)`), scoped per-warehouse for locations.
3. **Delete guard:** soft-deleting a warehouse that still has active storage
   locations is **blocked** with a user-facing error — no silent cascade.

## Types (`lib/types.ts` additions)

```ts
export interface Warehouse {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  code: string;
  name: string;
  address: string | null;
  is_active: boolean;
}

export interface StorageLocation {
  id?: string;
  created_at?: string;
  deleted_at?: string | null;
  warehouse_id: string;
  code: string;
  name: string | null;
  is_active: boolean;
}
```

## Data layer

New folder `lib/inventory/`:

- `lib/inventory/warehouses.ts`
  - `listWarehouses(supabase): Promise<Warehouse[]>` — `deleted_at is null`,
    ordered by `code`.
  - `createWarehouse(supabase, data): Promise<Warehouse>`
  - `updateWarehouse(supabase, id, data): Promise<Warehouse>`
  - `softDeleteWarehouse(supabase, id): Promise<void>` — sets `deleted_at`.
  - `countActiveLocations(supabase, warehouseId): Promise<number>` — used by the
    delete guard.
- `lib/inventory/storageLocations.ts`
  - `listStorageLocations(supabase): Promise<StorageLocation[]>` — active only,
    ordered by `warehouse_id, code`.
  - `createStorageLocation`, `updateStorageLocation`, `softDeleteStorageLocation`.

Create/update payloads omit `id`, `created_at`, `deleted_at` (mirrors the wires
data layer's `Omit<...>` pattern).

## Pages & UI

Both styled exactly like `components/WiresClient.tsx` (panels, inline add/edit
form, table, `confirm()` delete, inline error banner, spinners).

- **`app/admin/warehouses/page.tsx`** (server) → `components/WarehousesClient.tsx`
  - List: columns Code, Name, Address, Active; client-side search (code/name)
    and sort by code; empty state ("Belum ada gudang."), loading spinners on
    save/delete, inline error banner.
  - Inline add/edit form: code (required), name (required), address (optional),
    is_active (toggle, default true).
  - Soft delete via `confirm()`.

- **`app/admin/storage-locations/page.tsx`** (server) →
  `components/StorageLocationsClient.tsx`
  - Server page fetches both storage locations and warehouses (`Promise.all`) so
    the client can map `warehouse_id` → warehouse name and populate the selector.
  - List: columns Warehouse, Code, Name, Active; **warehouse filter** dropdown
    (All + each warehouse); search by code/name; sort by warehouse then code.
  - Inline add/edit form: warehouse (required select), code (required), name
    (optional), is_active.
  - Soft delete via `confirm()`.

Both server pages: `getUser()` → if no user redirect `/admin`; if
`roleFromUser(user) !== "admin"` redirect `/admin/queue` (viewers).

## Navigation

Add **Warehouses** and **Storage Locations** entries to
`components/AdminNav.tsx` `LINKS` (admin-only set), with lucide icons
(`Warehouse`, `MapPin`). The full collapsible ERP sidebar is a separate later
task; this slice only adds reachable links.

## Reusable components

Deliberately **deferred**. Building a generic `<DataTable>`/`<MasterForm>` for
two near-identical pages is premature. After **Items** lands (the third similar
page), extract a shared `<MasterTable>` + `<MasterForm>` shaped by real usage.
Slice 1 follows the existing inline-page style.

## Error handling

- Data-layer functions throw on Supabase error; clients catch and show an inline
  Indonesian error banner (matching `WiresClient`).
- Duplicate `code` (unique-index violation) → friendly message
  ("Kode sudah dipakai.").
- Warehouse delete with active locations → blocked, message
  ("Tidak bisa hapus: masih ada lokasi aktif di gudang ini.").

## Testing / verification

No automated test suite exists in this repo (per CLAUDE.md). Verification:
`npm run lint` + `npm run build`, plus manual checks:
1. Run the migration in Supabase; confirm tables + indexes + RLS policies exist.
2. As admin: create/edit/soft-delete a warehouse; confirm soft-deleted rows
   disappear from the list and `deleted_at` is set in the DB.
3. Duplicate code rejected with the friendly message; reusing a soft-deleted
   row's code succeeds (partial unique index).
4. Create storage locations under a warehouse; warehouse filter and name mapping
   work; sort/search behave.
5. Deleting a warehouse with active locations is blocked with the error.
6. As viewer: both pages redirect to `/admin/queue`.

## Git

No git commands are run by the assistant (project rule — the user commits
manually). Migration is applied by the user in Supabase.

## Out of scope (restated)

Export/PDF/print, activity log, column visibility, bulk actions, server-side
pagination, dark mode, full sidebar redesign, stock ledger/valuation/low-stock,
and reusable-component extraction — each handled in its own later slice.
