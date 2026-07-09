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
                    {rows.length === 0 ? "Belum ada gudang." : "Tidak ada hasil pencarian."}
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
