# Inventory Slice 2 — Items Catalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only Items master catalog (raw materials + finished goods) with CRUD, search, category filter, sort, soft delete, and empty/loading/error states.

**Architecture:** Mirror the slice-1 warehouses module: SQL migration → `lib/inventory/items.ts` data functions → server page (auth + admin role check) → `"use client"` `ItemsClient` with optimistic state and an inline add/edit form. Items hold master data + `reorder_level` only — no quantity column (on-hand is derived from the future stock ledger).

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind, Supabase (PostgreSQL) + Supabase Auth, lucide-react.

## Global Constraints

- **No git by the assistant.** Never run any git command. The user commits manually.
- **No automated test suite.** Verify with `npm run lint` and `npm run build`, plus the manual checks in each task. No test files are created.
- **The user applies the SQL migration** in Supabase; the assistant only writes the `.sql` file.
- **Admin-only:** pages redirect no-user → `/admin`, and `roleFromUser(user) !== "admin"` → `/admin/queue`.
- **Soft delete = `deleted_at` column** (null = active); lists filter `deleted_at is null`; delete sets `deleted_at = now()`.
- **Follow existing style:** `.admin-*` classes, lucide icons, inline forms (not modals), `confirm()` for delete, Indonesian copy, optimistic local state, `createClient()` from `@/lib/supabase/client`.
- **`sku` uniqueness:** case-insensitive among active rows (`lower(sku)`).
- **No quantity column** on items; no delete guard this slice (nothing references items yet).
- **Category labels:** `raw_material` → "Bahan Baku", `finished_good` → "Barang Jadi" (plain text, not a colored badge).
- Data-layer functions take a `SupabaseClient`, throw on error, return typed rows. Input type uses `Omit<Item, "id" | "created_at" | "deleted_at">`.

---

### Task 1: Migration + types

**Files:**
- Create: `supabase/migrations/0005_inventory_items.sql`
- Modify: `lib/types.ts` (append `ItemCategory` and `Item`)

**Interfaces:**
- Produces table `public.items`.
- Produces types:
  - `type ItemCategory = "raw_material" | "finished_good"`
  - `Item { id?: string; created_at?: string; deleted_at?: string | null; sku: string; name: string; category: ItemCategory; unit: string; cost_price: number; sale_price: number; reorder_level: number; is_active: boolean }`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_inventory_items.sql`:

```sql
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
```

- [ ] **Step 2: Append types to `lib/types.ts`**

Add at the end of `lib/types.ts`:

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

- [ ] **Step 3: Verify SQL parses (lightweight)**

The assistant does not run the migration. Confirm balanced parentheses and a
trailing newline. The user runs it in Supabase.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/types.ts`.

---

### Task 2: Items data layer

**Files:**
- Create: `lib/inventory/items.ts`

**Interfaces:**
- Consumes: `Item` (Task 1), `SupabaseClient`.
- Produces:
  - `type ItemInput = Omit<Item, "id" | "created_at" | "deleted_at">`
  - `listItems(supabase): Promise<Item[]>` — active only, order by `sku` asc.
  - `createItem(supabase, data: ItemInput): Promise<Item>`
  - `updateItem(supabase, id: string, data: ItemInput): Promise<Item>`
  - `softDeleteItem(supabase, id: string): Promise<void>`

- [ ] **Step 1: Write the data-layer module**

Create `lib/inventory/items.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item } from "@/lib/types";

export type ItemInput = Omit<Item, "id" | "created_at" | "deleted_at">;

export async function listItems(supabase: SupabaseClient): Promise<Item[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .is("deleted_at", null)
    .order("sku", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Item[];
}

export async function createItem(
  supabase: SupabaseClient,
  data: ItemInput
): Promise<Item> {
  const { data: row, error } = await supabase
    .from("items")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return row as Item;
}

export async function updateItem(
  supabase: SupabaseClient,
  id: string,
  data: ItemInput
): Promise<Item> {
  const { data: row, error } = await supabase
    .from("items")
    .update(data)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return row as Item;
}

export async function softDeleteItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("items")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in `lib/inventory/items.ts`.

---

### Task 3: Navigation entry

**Files:**
- Modify: `components/AdminNav.tsx`

**Interfaces:**
- Produces: new `AdminPage` key `"items"`, linked in the admin nav.

- [ ] **Step 1: Add the icon, page key, and link**

In `components/AdminNav.tsx`:

Add `Package` to the lucide import (it currently imports
`Home, Users, Cable, FileText, ListChecks, Warehouse, MapPin`):
```tsx
import { Home, Users, Cable, FileText, ListChecks, Warehouse, MapPin, Package } from "lucide-react";
```

Add `"items"` to the `AdminPage` union (after `"storage-locations"`):
```tsx
  | "storage-locations"
  | "items";
```

Add this entry to the `LINKS` array, immediately after the `wires` entry:
```tsx
  { key: "items", href: "/admin/items", label: "Items", Icon: Package },
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no new errors in `components/AdminNav.tsx`.

---

### Task 4: Items page + client

**Files:**
- Create: `app/admin/items/page.tsx`
- Create: `components/ItemsClient.tsx`

**Interfaces:**
- Consumes: `listItems`, `createItem`, `updateItem`, `softDeleteItem`, `ItemInput` (Task 2); `Item`, `ItemCategory` (Task 1); `roleFromUser` (`@/lib/auth`); `AdminNav` with `active="items"` (Task 3); the existing `.admin-badge-green`/`.admin-badge-gray` classes (added in slice 1).
- Produces: route `/admin/items`.

- [ ] **Step 1: Write the server page**

Create `app/admin/items/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roleFromUser } from "@/lib/auth";
import { listItems } from "@/lib/inventory/items";
import ItemsClient from "@/components/ItemsClient";

export const metadata = { title: "Items — Ruslie Spring Admin" };

export default async function AdminItemsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin");
  if (roleFromUser(user) !== "admin") redirect("/admin/queue");

  const items = await listItems(supabase);
  return <ItemsClient initialItems={items} />;
}
```

- [ ] **Step 2: Write the client component**

Create `components/ItemsClient.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X, Pencil, Search } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createItem,
  updateItem,
  softDeleteItem,
  type ItemInput,
} from "@/lib/inventory/items";
import type { Item, ItemCategory } from "@/lib/types";

function rupiah(n: number): string {
  return "Rp" + (n || 0).toLocaleString("id-ID");
}

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  raw_material: "Bahan Baku",
  finished_good: "Barang Jadi",
};

export default function ItemsClient({
  initialItems,
}: {
  initialItems: Item[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Item[]>(initialItems);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<"" | ItemCategory>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // draft
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ItemCategory>("raw_material");
  const [unit, setUnit] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [isActive, setIsActive] = useState(true);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = rows.filter((it) => {
      if (filterCat && it.category !== filterCat) return false;
      if (!q) return true;
      return (
        it.sku.toLowerCase().includes(q) || it.name.toLowerCase().includes(q)
      );
    });
    return [...base].sort((a, b) => a.sku.localeCompare(b.sku));
  }, [rows, search, filterCat]);

  function resetDraft() {
    setEditingId(null);
    setSku("");
    setName("");
    setCategory("raw_material");
    setUnit("");
    setCostPrice("");
    setSalePrice("");
    setReorderLevel("");
    setIsActive(true);
  }

  function startEdit(it: Item) {
    setEditingId(it.id ?? null);
    setSku(it.sku);
    setName(it.name);
    setCategory(it.category);
    setUnit(it.unit);
    setCostPrice(String(it.cost_price));
    setSalePrice(String(it.sale_price));
    setReorderLevel(String(it.reorder_level));
    setIsActive(it.is_active);
  }

  // Parse a money/qty input: blank -> 0; reject negatives / non-numbers (returns null).
  function parseNum(s: string): number | null {
    if (!s.trim()) return 0;
    const n = Number(s);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }

  async function save() {
    setError("");
    if (!sku.trim()) { setError("SKU wajib diisi."); return; }
    if (!name.trim()) { setError("Nama item wajib diisi."); return; }
    if (!unit.trim()) { setError("Satuan wajib diisi."); return; }
    const cost = parseNum(costPrice);
    const sale = parseNum(salePrice);
    const reorder = parseNum(reorderLevel);
    if (cost === null || sale === null || reorder === null) {
      setError("Harga/jumlah harus angka ≥ 0.");
      return;
    }
    const payload: ItemInput = {
      sku: sku.trim(),
      name: name.trim(),
      category,
      unit: unit.trim(),
      cost_price: cost,
      sale_price: sale,
      reorder_level: reorder,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const u = await updateItem(supabase, editingId, payload);
        setRows((prev) => prev.map((it) => (it.id === editingId ? u : it)));
      } else {
        const c = await createItem(supabase, payload);
        setRows((prev) => [...prev, c]);
      }
      resetDraft();
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code === "23505"
        ? "SKU sudah dipakai."
        : "Gagal menyimpan item.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(it: Item) {
    if (!it.id || !confirm("Hapus item ini?")) return;
    setDeletingId(it.id);
    setError("");
    try {
      await softDeleteItem(supabase, it.id);
      setRows((prev) => prev.filter((x) => x.id !== it.id));
      if (editingId === it.id) resetDraft();
    } catch {
      setError("Gagal menghapus item.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="items" />
      <div className="admin-content max-w-5xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Items</h1>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        {/* Add / edit form */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Item" : "Tambah Item"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="SKU (mis. RM-0001)"
              className="admin-input"
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama item"
              className="admin-input"
            />
            <div className="admin-select-wrap">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="admin-input"
              >
                <option value="raw_material">Bahan Baku</option>
                <option value="finished_good">Barang Jadi</option>
              </select>
            </div>
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Satuan (mis. pcs, kg, m)"
              className="admin-input"
            />
            <input
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              inputMode="decimal"
              placeholder="Harga modal"
              className="admin-input"
            />
            <input
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              inputMode="decimal"
              placeholder="Harga jual"
              className="admin-input"
            />
            <input
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              inputMode="decimal"
              placeholder="Batas stok minimum"
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

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari SKU / nama…"
              className="admin-input pl-9 w-full"
            />
          </div>
          <div className="admin-select-wrap">
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value as "" | ItemCategory)}
              className="admin-input"
            >
              <option value="">Semua kategori</option>
              <option value="raw_material">Bahan Baku</option>
              <option value="finished_good">Barang Jadi</option>
            </select>
          </div>
        </div>

        {/* List */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nama</th>
                <th>Kategori</th>
                <th>Satuan</th>
                <th className="!text-right">Modal</th>
                <th className="!text-right">Jual</th>
                <th className="!text-right">Min. Stok</th>
                <th>Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="!text-center py-10 text-gray-400 italic">
                    {rows.length === 0 ? "Belum ada item." : "Tidak ada hasil pencarian."}
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr key={it.id}>
                    <td className="font-medium text-gray-800">{it.sku}</td>
                    <td className="text-gray-700">{it.name}</td>
                    <td className="text-gray-500">{CATEGORY_LABEL[it.category]}</td>
                    <td className="text-gray-500">{it.unit}</td>
                    <td className="!text-right text-gray-700">{rupiah(it.cost_price)}</td>
                    <td className="!text-right text-gray-700">{rupiah(it.sale_price)}</td>
                    <td className="!text-right text-gray-500">{it.reorder_level} {it.unit}</td>
                    <td>
                      <span className={it.is_active ? "admin-badge-green" : "admin-badge-gray"}>
                        {it.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEdit(it)} className="text-gray-400 hover:text-[#021d47] transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(it)} disabled={deletingId === it.id} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60" title="Hapus">
                          {deletingId === it.id ? <span className="admin-spinner-xs" /> : <Trash2 size={15} />}
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
Expected: build compiles; `/admin/items` appears in the route list.

---

### Task 5: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Apply the migration**

The user runs `supabase/migrations/0005_inventory_items.sql` in Supabase.
Confirm the `items` table, both indexes, and the RLS policy exist.

- [ ] **Step 2: Run the dev server**

Run: `npm run dev`

- [ ] **Step 3: Items CRUD (as admin)**

1. Open `/admin/items`. Empty state reads "Belum ada item."
2. Create a raw-material item (SKU `RM-0001`, unit `kg`, cost/sale/reorder numbers) → appears; Modal/Jual render as Rupiah; Min. Stok shows the number + unit; Kategori shows "Bahan Baku"; Status "Aktif".
3. Create a finished-good item → Kategori "Barang Jadi".
4. Edit an item; toggle Aktif off → badge "Nonaktif".
5. Duplicate SKU `rm-0001` (different case) → blocked with "SKU sudah dipakai."
6. Enter letters or a negative number in a price field → "Harga/jumlah harus angka ≥ 0."

- [ ] **Step 4: Search / filter / delete**

1. Search filters by SKU/name; category filter narrows to one category; combined with search behaves; sort is by SKU.
2. A search that matches nothing shows "Tidak ada hasil pencarian." (not the empty-data message).
3. Soft-delete an item → disappears from the list; confirm `deleted_at` set in the DB; reusing that SKU on a new item succeeds.

- [ ] **Step 5: Viewer gate**

Sign in as a viewer (or set role to viewer) → `/admin/items` redirects to `/admin/queue`.

---

## Self-Review

**Spec coverage:**
- Migration + RLS + indexes (sku unique active/case-insensitive, category index) → Task 1.
- Types `ItemCategory`, `Item` → Task 1.
- No quantity column; `reorder_level` present → Task 1.
- Data layer `lib/inventory/items.ts` (list active+sorted, create, update, softDelete) → Task 2.
- Nav entry → Task 3.
- Page admin-only redirect (no-user → `/admin`; viewer → `/admin/queue`) → Task 4 Step 1.
- Inline form with all fields; number parse/validate; Rupiah display; category text labels; category filter; search; sort; empty vs no-results; soft delete; duplicate-SKU message → Task 4 Step 2.
- Verification → Task 5.

**Placeholder scan:** none — all steps contain concrete code/commands.

**Type consistency:** `ItemInput` defined in Task 2, consumed in Task 4. `Item`/`ItemCategory` fields match the migration columns and are used consistently. `AdminPage` key `"items"` defined in Task 3, used as `active="items"` in Task 4. `CATEGORY_LABEL` keys match `ItemCategory`. Number fields parsed via `parseNum` before building `ItemInput` (numeric types).

**Deferred per spec (not gaps):** on-hand qty / stock ledger / low-stock alerts; reusable-component extraction; wires→items unification; export/PDF/print/activity-log; delete guard.
