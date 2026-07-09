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
