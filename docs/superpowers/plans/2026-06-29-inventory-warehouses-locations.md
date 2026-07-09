# Inventory Slice 1 — Warehouses + Storage Locations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin-only Warehouses and Storage Locations master-data CRUD (with search, sort, soft delete, and empty/loading/error states) as the first slice of the ERP Inventory core.

**Architecture:** Mirror the existing wires module: SQL migration → `lib/inventory/<entity>.ts` data functions → server page (auth/role check + `Promise.all` fetch) → `"use client"` `<XClient>` with optimistic state and inline add/edit forms. Soft delete via a `deleted_at` column (the new ERP-wide convention).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind, Supabase (PostgreSQL) + Supabase Auth, lucide-react.

## Global Constraints

- **No git by the assistant.** Never run any git command. The user commits manually.
- **No automated test suite.** Verify with `npm run lint` and `npm run build`, plus the manual checks in each task. No test files are created.
- **The user applies the SQL migration** in Supabase; the assistant only writes the `.sql` file.
- **Admin-only:** pages redirect no-user → `/admin`, and `roleFromUser(user) !== "admin"` → `/admin/queue`.
- **Soft delete = `deleted_at` column** (null = active); lists filter `deleted_at is null`; delete sets `deleted_at = now()`.
- **Follow existing style:** `.admin-*` classes, lucide icons, inline forms (not modals), `confirm()` for delete, Indonesian copy, optimistic local state, `createClient()` from `@/lib/supabase/client`.
- **`code` uniqueness:** case-insensitive among active rows (warehouses global; locations per-warehouse).
- Data-layer functions take a `SupabaseClient`, throw on error, return typed rows. Create/update payloads use `Omit<T, "id" | "created_at" | "deleted_at">`.

---

### Task 1: Database migration + shared types

**Files:**
- Create: `supabase/migrations/0004_inventory_warehouses.sql`
- Modify: `lib/types.ts` (append `Warehouse` and `StorageLocation`)

**Interfaces:**
- Produces tables `public.warehouses` and `public.storage_locations`.
- Produces types:
  - `Warehouse { id?: string; created_at?: string; deleted_at?: string | null; code: string; name: string; address: string | null; is_active: boolean }`
  - `StorageLocation { id?: string; created_at?: string; deleted_at?: string | null; warehouse_id: string; code: string; name: string | null; is_active: boolean }`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0004_inventory_warehouses.sql`:

```sql
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
```

- [ ] **Step 2: Append types to `lib/types.ts`**

Add at the end of `lib/types.ts`:

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

- [ ] **Step 3: Verify the SQL parses (lightweight)**

The assistant does not run the migration. Confirm the file has balanced
parentheses and ends with a newline. The user will run it in Supabase.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/types.ts`.

---

### Task 2: Warehouses data layer

**Files:**
- Create: `lib/inventory/warehouses.ts`

**Interfaces:**
- Consumes: `Warehouse` (Task 1), `SupabaseClient`.
- Produces:
  - `listWarehouses(supabase: SupabaseClient): Promise<Warehouse[]>`
  - `createWarehouse(supabase, data: WarehouseInput): Promise<Warehouse>`
  - `updateWarehouse(supabase, id: string, data: WarehouseInput): Promise<Warehouse>`
  - `softDeleteWarehouse(supabase, id: string): Promise<void>`
  - `countActiveLocations(supabase, warehouseId: string): Promise<number>`
  - `type WarehouseInput = Omit<Warehouse, "id" | "created_at" | "deleted_at">`

- [ ] **Step 1: Write the data-layer module**

Create `lib/inventory/warehouses.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Warehouse } from "@/lib/types";

export type WarehouseInput = Omit<Warehouse, "id" | "created_at" | "deleted_at">;

export async function listWarehouses(
  supabase: SupabaseClient
): Promise<Warehouse[]> {
  const { data, error } = await supabase
    .from("warehouses")
    .select("*")
    .is("deleted_at", null)
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Warehouse[];
}

export async function createWarehouse(
  supabase: SupabaseClient,
  data: WarehouseInput
): Promise<Warehouse> {
  const { data: row, error } = await supabase
    .from("warehouses")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Warehouse;
}

export async function updateWarehouse(
  supabase: SupabaseClient,
  id: string,
  data: WarehouseInput
): Promise<Warehouse> {
  const { data: row, error } = await supabase
    .from("warehouses")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Warehouse;
}

export async function softDeleteWarehouse(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("warehouses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Used by the delete guard: count active (non-deleted) locations in a warehouse.
export async function countActiveLocations(
  supabase: SupabaseClient,
  warehouseId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("storage_locations")
    .select("id", { count: "exact", head: true })
    .eq("warehouse_id", warehouseId)
    .is("deleted_at", null);
  if (error) throw error;
  return count ?? 0;
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/inventory/warehouses.ts`.

---

### Task 3: Storage Locations data layer

**Files:**
- Create: `lib/inventory/storageLocations.ts`

**Interfaces:**
- Consumes: `StorageLocation` (Task 1), `SupabaseClient`.
- Produces:
  - `listStorageLocations(supabase): Promise<StorageLocation[]>`
  - `createStorageLocation(supabase, data: StorageLocationInput): Promise<StorageLocation>`
  - `updateStorageLocation(supabase, id, data: StorageLocationInput): Promise<StorageLocation>`
  - `softDeleteStorageLocation(supabase, id): Promise<void>`
  - `type StorageLocationInput = Omit<StorageLocation, "id" | "created_at" | "deleted_at">`

- [ ] **Step 1: Write the data-layer module**

Create `lib/inventory/storageLocations.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { StorageLocation } from "@/lib/types";

export type StorageLocationInput = Omit<
  StorageLocation,
  "id" | "created_at" | "deleted_at"
>;

export async function listStorageLocations(
  supabase: SupabaseClient
): Promise<StorageLocation[]> {
  const { data, error } = await supabase
    .from("storage_locations")
    .select("*")
    .is("deleted_at", null)
    .order("warehouse_id", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw error;
  return (data ?? []) as StorageLocation[];
}

export async function createStorageLocation(
  supabase: SupabaseClient,
  data: StorageLocationInput
): Promise<StorageLocation> {
  const { data: row, error } = await supabase
    .from("storage_locations")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as StorageLocation;
}

export async function updateStorageLocation(
  supabase: SupabaseClient,
  id: string,
  data: StorageLocationInput
): Promise<StorageLocation> {
  const { data: row, error } = await supabase
    .from("storage_locations")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as StorageLocation;
}

export async function softDeleteStorageLocation(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("storage_locations")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/inventory/storageLocations.ts`.

---

### Task 4: Navigation entries

**Files:**
- Modify: `components/AdminNav.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: two new `AdminPage` keys `"warehouses"` and `"storage-locations"`, linked in the admin (non-viewer) nav.

- [ ] **Step 1: Add the icons + page keys + links**

In `components/AdminNav.tsx`:

Change the lucide import to add `Warehouse` and `MapPin`:
```tsx
import { Home, Users, Cable, FileText, ListChecks, Warehouse, MapPin } from "lucide-react";
```

Extend the `AdminPage` type:
```tsx
export type AdminPage =
  | "dashboard"
  | "customers"
  | "wires"
  | "transaction"
  | "queue"
  | "warehouses"
  | "storage-locations";
```

Add two entries to the `LINKS` array (after the `wires` entry):
```tsx
  { key: "warehouses", href: "/admin/warehouses", label: "Warehouses", Icon: Warehouse },
  { key: "storage-locations", href: "/admin/storage-locations", label: "Locations", Icon: MapPin },
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in `components/AdminNav.tsx`.

---

### Task 5: Warehouses page + client

**Files:**
- Create: `app/admin/warehouses/page.tsx`
- Create: `components/WarehousesClient.tsx`

**Interfaces:**
- Consumes: `listWarehouses`, `createWarehouse`, `updateWarehouse`, `softDeleteWarehouse`, `countActiveLocations`, `WarehouseInput` (Task 2); `Warehouse` (Task 1); `roleFromUser` (`@/lib/auth`); `AdminNav` with `active="warehouses"` (Task 4).
- Produces: route `/admin/warehouses`.

- [ ] **Step 1: Write the server page**

Create `app/admin/warehouses/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listWarehouses } from "@/lib/inventory/warehouses";
import WarehousesClient from "@/components/WarehousesClient";

export const metadata = { title: "Warehouses — Ruslie Spring Admin" };

export default async function AdminWarehousesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const warehouses = await listWarehouses(supabase);
  return <WarehousesClient initialWarehouses={warehouses} />;
}
```

- [ ] **Step 2: Write the client component**

Create `components/WarehousesClient.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X, Pencil, Search } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createWarehouse,
  updateWarehouse,
  softDeleteWarehouse,
  countActiveLocations,
  type WarehouseInput,
} from "@/lib/inventory/warehouses";
import type { Warehouse } from "@/lib/types";

export default function WarehousesClient({
  initialWarehouses,
}: {
  initialWarehouses: Warehouse[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Warehouse[]>(initialWarehouses);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // draft
  const [editingId, setEditingId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (w) =>
            w.code.toLowerCase().includes(q) || w.name.toLowerCase().includes(q)
        )
      : rows;
    return [...base].sort((a, b) => a.code.localeCompare(b.code));
  }, [rows, search]);

  function resetDraft() {
    setEditingId(null);
    setCode("");
    setName("");
    setAddress("");
    setIsActive(true);
  }

  function startEdit(w: Warehouse) {
    setEditingId(w.id ?? null);
    setCode(w.code);
    setName(w.name);
    setAddress(w.address ?? "");
    setIsActive(w.is_active);
  }

  async function save() {
    setError("");
    if (!code.trim()) { setError("Kode gudang wajib diisi."); return; }
    if (!name.trim()) { setError("Nama gudang wajib diisi."); return; }
    const payload: WarehouseInput = {
      code: code.trim(),
      name: name.trim(),
      address: address.trim() || null,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const u = await updateWarehouse(supabase, editingId, payload);
        setRows((prev) => prev.map((w) => (w.id === editingId ? u : w)));
      } else {
        const c = await createWarehouse(supabase, payload);
        setRows((prev) => [...prev, c]);
      }
      resetDraft();
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code === "23505"
        ? "Kode sudah dipakai."
        : "Gagal menyimpan gudang.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(w: Warehouse) {
    if (!w.id) return;
    setError("");
    try {
      const activeLocs = await countActiveLocations(supabase, w.id);
      if (activeLocs > 0) {
        setError("Tidak bisa hapus: masih ada lokasi aktif di gudang ini.");
        return;
      }
    } catch {
      setError("Gagal memeriksa lokasi gudang.");
      return;
    }
    if (!confirm("Hapus gudang ini?")) return;
    setDeletingId(w.id);
    try {
      await softDeleteWarehouse(supabase, w.id);
      setRows((prev) => prev.filter((x) => x.id !== w.id));
      if (editingId === w.id) resetDraft();
    } catch {
      setError("Gagal menghapus gudang.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="warehouses" />
      <div className="admin-content max-w-4xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Warehouses</h1>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        {/* Add / edit form */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Gudang" : "Tambah Gudang"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Kode (mis. WH-01)"
              className="admin-input"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama gudang"
              className="admin-input"
            />
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat (opsional)"
              className="admin-input sm:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktif
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving} className="admin-btn">
              {saving ? <span className="admin-btn-spinner" /> : <Save size={14} />}
              {saving ? "Menyimpan…" : editingId ? "Update" : "Simpan"}
            </button>
            {editingId && (
              <button onClick={resetDraft} className="admin-btn-ghost">
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari kode / nama…"
            className="admin-input pl-9"
          />
        </div>

        {/* List */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama</th>
                <th>Alamat</th>
                <th>Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!text-center py-10 text-gray-400 italic">
                    Belum ada gudang.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w.id}>
                    <td className="font-medium text-gray-800">{w.code}</td>
                    <td className="text-gray-700">{w.name}</td>
                    <td className="text-gray-500">{w.address ?? "—"}</td>
                    <td>
                      <span className={w.is_active ? "admin-badge-green" : "admin-badge-gray"}>
                        {w.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEdit(w)} className="text-gray-400 hover:text-[#021d47] transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(w)} disabled={deletingId === w.id} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60" title="Hapus">
                          {deletingId === w.id ? <span className="admin-spinner-xs" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add status badge styles if missing**

Check `app/globals.css` for `.admin-badge-green` / `.admin-badge-gray`. If they
do not exist, append:

```css
.admin-badge-green {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #15803d;
  background: rgba(22, 163, 74, 0.1);
  border: 1px solid rgba(22, 163, 74, 0.2);
}
.admin-badge-gray {
  display: inline-block;
  padding: 0.15rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #6b7280;
  background: rgba(107, 114, 128, 0.1);
  border: 1px solid rgba(107, 114, 128, 0.2);
}
```

- [ ] **Step 4: Lint + build**

Run: `npm run lint` then `npm run build`
Expected: build compiles; `/admin/warehouses` appears in the route list.

---

### Task 6: Storage Locations page + client

**Files:**
- Create: `app/admin/storage-locations/page.tsx`
- Create: `components/StorageLocationsClient.tsx`

**Interfaces:**
- Consumes: `listStorageLocations`, `createStorageLocation`, `updateStorageLocation`, `softDeleteStorageLocation`, `StorageLocationInput` (Task 3); `listWarehouses` (Task 2); `StorageLocation`, `Warehouse` (Task 1); `roleFromUser`; `AdminNav` with `active="storage-locations"` (Task 4); badge styles (Task 5 Step 3).
- Produces: route `/admin/storage-locations`.

- [ ] **Step 1: Write the server page**

Create `app/admin/storage-locations/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listStorageLocations } from "@/lib/inventory/storageLocations";
import { listWarehouses } from "@/lib/inventory/warehouses";
import StorageLocationsClient from "@/components/StorageLocationsClient";

export const metadata = { title: "Storage Locations — Ruslie Spring Admin" };

export default async function AdminStorageLocationsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const [locations, warehouses] = await Promise.all([
    listStorageLocations(supabase),
    listWarehouses(supabase),
  ]);
  return (
    <StorageLocationsClient
      initialLocations={locations}
      initialWarehouses={warehouses}
    />
  );
}
```

- [ ] **Step 2: Write the client component**

Create `components/StorageLocationsClient.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X, Pencil, Search } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createStorageLocation,
  updateStorageLocation,
  softDeleteStorageLocation,
  type StorageLocationInput,
} from "@/lib/inventory/storageLocations";
import type { StorageLocation, Warehouse } from "@/lib/types";

export default function StorageLocationsClient({
  initialLocations,
  initialWarehouses,
}: {
  initialLocations: StorageLocation[];
  initialWarehouses: Warehouse[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<StorageLocation[]>(initialLocations);
  const [warehouses] = useState<Warehouse[]>(initialWarehouses);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterWh, setFilterWh] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // draft
  const [editingId, setEditingId] = useState<string | null>(null);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);

  function warehouseName(id: string): string {
    return warehouses.find((w) => w.id === id)?.code ?? "—";
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = rows.filter((l) => {
      if (filterWh && l.warehouse_id !== filterWh) return false;
      if (!q) return true;
      return (
        l.code.toLowerCase().includes(q) ||
        (l.name ?? "").toLowerCase().includes(q)
      );
    });
    return [...base].sort(
      (a, b) =>
        warehouseName(a.warehouse_id).localeCompare(warehouseName(b.warehouse_id)) ||
        a.code.localeCompare(b.code)
    );
    // warehouseName depends on `warehouses`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, search, filterWh, warehouses]);

  function resetDraft() {
    setEditingId(null);
    setWarehouseId("");
    setCode("");
    setName("");
    setIsActive(true);
  }

  function startEdit(l: StorageLocation) {
    setEditingId(l.id ?? null);
    setWarehouseId(l.warehouse_id);
    setCode(l.code);
    setName(l.name ?? "");
    setIsActive(l.is_active);
  }

  async function save() {
    setError("");
    if (!warehouseId) { setError("Gudang wajib dipilih."); return; }
    if (!code.trim()) { setError("Kode lokasi wajib diisi."); return; }
    const payload: StorageLocationInput = {
      warehouse_id: warehouseId,
      code: code.trim(),
      name: name.trim() || null,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const u = await updateStorageLocation(supabase, editingId, payload);
        setRows((prev) => prev.map((l) => (l.id === editingId ? u : l)));
      } else {
        const c = await createStorageLocation(supabase, payload);
        setRows((prev) => [...prev, c]);
      }
      resetDraft();
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code === "23505"
        ? "Kode sudah dipakai di gudang ini."
        : "Gagal menyimpan lokasi.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(l: StorageLocation) {
    if (!l.id || !confirm("Hapus lokasi ini?")) return;
    setDeletingId(l.id);
    setError("");
    try {
      await softDeleteStorageLocation(supabase, l.id);
      setRows((prev) => prev.filter((x) => x.id !== l.id));
      if (editingId === l.id) resetDraft();
    } catch {
      setError("Gagal menghapus lokasi.");
    } finally {
      setDeletingId(null);
    }
  }

  const noWarehouses = warehouses.length === 0;

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="storage-locations" />
      <div className="admin-content max-w-4xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Storage Locations</h1>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}
        {noWarehouses && (
          <p className="admin-error mb-4" style={{ color: "#b45309" }}>
            ⚠ Belum ada gudang. Tambah gudang dulu di menu Warehouses.
          </p>
        )}

        {/* Add / edit form */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Lokasi" : "Tambah Lokasi"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="admin-select-wrap">
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="admin-input"
                disabled={noWarehouses}
              >
                <option value="">— Pilih gudang —</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Kode lokasi (mis. A-01-03)"
              className="admin-input"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lokasi (opsional)"
              className="admin-input"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Aktif
            </label>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={saving || noWarehouses} className="admin-btn">
              {saving ? <span className="admin-btn-spinner" /> : <Save size={14} />}
              {saving ? "Menyimpan…" : editingId ? "Update" : "Simpan"}
            </button>
            {editingId && (
              <button onClick={resetDraft} className="admin-btn-ghost">
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode / nama…"
              className="admin-input pl-9 w-full"
            />
          </div>
          <div className="admin-select-wrap">
            <select
              value={filterWh}
              onChange={(e) => setFilterWh(e.target.value)}
              className="admin-input"
            >
              <option value="">Semua gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.code}</option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Gudang</th>
                <th>Kode</th>
                <th>Nama</th>
                <th>Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!text-center py-10 text-gray-400 italic">
                    Belum ada lokasi.
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="text-gray-600">{warehouseName(l.warehouse_id)}</td>
                    <td className="font-medium text-gray-800">{l.code}</td>
                    <td className="text-gray-500">{l.name ?? "—"}</td>
                    <td>
                      <span className={l.is_active ? "admin-badge-green" : "admin-badge-gray"}>
                        {l.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEdit(l)} className="text-gray-400 hover:text-[#021d47] transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(l)} disabled={deletingId === l.id} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60" title="Hapus">
                          {deletingId === l.id ? <span className="admin-spinner-xs" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Lint + build**

Run: `npm run lint` then `npm run build`
Expected: build compiles; `/admin/storage-locations` appears in the route list.

---

### Task 7: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Apply the migration**

The user runs `supabase/migrations/0004_inventory_warehouses.sql` in Supabase
(SQL editor or CLI). Confirm both tables, the unique indexes, and the RLS
policies exist.

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`

- [ ] **Step 3: Warehouses CRUD (as admin)**

1. Open `/admin/warehouses`. Empty state reads "Belum ada gudang."
2. Create a warehouse (code `WH-01`, name) → appears in the list with an "Aktif" badge.
3. Edit it; toggle Aktif off → badge becomes "Nonaktif".
4. Try a second warehouse with code `wh-01` → blocked with "Kode sudah dipakai." (case-insensitive).
5. Search filters by code/name.
6. Soft-delete the warehouse → it disappears; confirm `deleted_at` is set in the DB and the row is gone from the list.

- [ ] **Step 4: Storage Locations CRUD (as admin)**

1. With no warehouses, `/admin/storage-locations` shows the "Tambah gudang dulu" warning and a disabled form.
2. With a warehouse present, create a location (select warehouse, code `A-01`) → appears with the warehouse code in the Gudang column.
3. Duplicate code in the same warehouse → "Kode sudah dipakai di gudang ini."; same code in a different warehouse → allowed.
4. Warehouse filter + search behave; sort is by warehouse then code.
5. Soft-delete a location → disappears.

- [ ] **Step 5: Delete guard + viewer gate**

1. Create a warehouse, add an active location to it, then try to delete the warehouse → blocked with "Tidak bisa hapus: masih ada lokasi aktif di gudang ini."
2. Sign in as a viewer (or set role to viewer) → `/admin/warehouses` and `/admin/storage-locations` both redirect to `/admin/queue`.

---

## Self-Review

**Spec coverage:**
- Migration + RLS + indexes → Task 1.
- Soft-delete convention (`deleted_at`) → Tasks 1–3, 5, 6.
- `code` uniqueness (active-only, case-insensitive, per-warehouse for locations) → Task 1 indexes + friendly `23505` messages in Tasks 5/6.
- Data layer `lib/inventory/` → Tasks 2, 3.
- Warehouses page (CRUD/search/sort/empty/loading/error) → Task 5.
- Storage Locations page (+ warehouse filter, name mapping) → Task 6.
- Admin-only redirect (no-user → `/admin`; viewer → `/admin/queue`) → Tasks 5, 6.
- Delete guard (block warehouse delete with active locations) → Task 2 `countActiveLocations` + Task 5 `remove`.
- Navigation entries → Task 4.
- Verification plan → Task 7.

**Placeholder scan:** none — all steps contain concrete code/commands.

**Type consistency:** `WarehouseInput` / `StorageLocationInput` defined in Tasks 2/3 and consumed in Tasks 5/6. `Warehouse`/`StorageLocation` fields match the migration columns. `AdminPage` keys `"warehouses"`/`"storage-locations"` defined in Task 4 and used as `active=` in Tasks 5/6. Badge classes defined in Task 5 Step 3, reused in Task 6.

**Deferred per spec (not gaps):** export/PDF/print, activity log, column visibility, bulk actions, server-side pagination, dark mode, reusable-component extraction, stock ledger.
