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

  function warehouseCode(id: string): string {
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
        warehouseCode(a.warehouse_id).localeCompare(warehouseCode(b.warehouse_id)) ||
        a.code.localeCompare(b.code)
    );
    // warehouseCode depends on `warehouses`
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
                    {rows.length === 0 ? "Belum ada lokasi." : "Tidak ada hasil pencarian."}
                  </td>
                </tr>
              ) : (
                filtered.map((l) => (
                  <tr key={l.id}>
                    <td className="text-gray-600">{warehouseCode(l.warehouse_id)}</td>
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
