"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createWire,
  updateWire,
  deleteWire,
  createWireType,
  updateWireType,
  deleteWireType,
} from "@/lib/wires";
import type { Wire, WireType } from "@/lib/types";

export default function WiresClient({
  initialWires,
  initialTypes,
}: {
  initialWires: Wire[];
  initialTypes: WireType[];
}) {
  const [wires, setWires] = useState<Wire[]>(initialWires);
  const [types, setTypes] = useState<WireType[]>(initialTypes);
  const [error, setError] = useState("");
  const [savingType, setSavingType] = useState(false);
  const [savingWire, setSavingWire] = useState(false);
  const [deletingTypeId, setDeletingTypeId] = useState<string | null>(null);
  const [deletingWireId, setDeletingWireId] = useState<string | null>(null);

  // wire draft
  const [wireName, setWireName] = useState("");
  const [wireTypeId, setWireTypeId] = useState<string>("");
  const [editingWireId, setEditingWireId] = useState<string | null>(null);

  // type draft
  const [typeName, setTypeName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  function typeNameOf(id?: string | null): string {
    return types.find((t) => t.type_id === id)?.name ?? "—";
  }

  /* ── Wire types ── */
  async function saveType() {
    setError("");
    if (!typeName.trim()) { setError("Nama tipe wajib diisi."); return; }
    setSavingType(true);
    try {
      if (editingTypeId) {
        const u = await updateWireType(supabase, editingTypeId, typeName.trim());
        setTypes((prev) => prev.map((t) => (t.type_id === editingTypeId ? u : t)));
      } else {
        const c = await createWireType(supabase, typeName.trim());
        setTypes((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setTypeName("");
      setEditingTypeId(null);
    } catch {
      setError("Gagal menyimpan tipe (mungkin nama duplikat).");
    } finally {
      setSavingType(false);
    }
  }

  async function removeType(id: string) {
    if (!confirm("Hapus tipe ini? Wire yang memakainya akan kehilangan tipe.")) return;
    setDeletingTypeId(id);
    try {
      await deleteWireType(supabase, id);
      setTypes((prev) => prev.filter((t) => t.type_id !== id));
    } catch {
      setError("Gagal menghapus tipe.");
    } finally {
      setDeletingTypeId(null);
    }
  }

  /* ── Wires ── */
  async function saveWire() {
    setError("");
    if (!wireName.trim()) { setError("Nama wire wajib diisi."); return; }
    const payload = { name: wireName.trim(), type_id: wireTypeId || null };
    setSavingWire(true);
    try {
      if (editingWireId) {
        const u = await updateWire(supabase, editingWireId, payload);
        setWires((prev) => prev.map((w) => (w.wire_id === editingWireId ? u : w)));
      } else {
        const c = await createWire(supabase, payload);
        setWires((prev) => [...prev, c].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setWireName("");
      setWireTypeId("");
      setEditingWireId(null);
    } catch {
      setError("Gagal menyimpan wire.");
    } finally {
      setSavingWire(false);
    }
  }

  async function removeWire(id: string) {
    if (!confirm("Hapus wire ini?")) return;
    setDeletingWireId(id);
    try {
      await deleteWire(supabase, id);
      setWires((prev) => prev.filter((w) => w.wire_id !== id));
    } catch {
      setError("Gagal menghapus wire.");
    } finally {
      setDeletingWireId(null);
    }
  }

  function startEditWire(w: Wire) {
    setEditingWireId(w.wire_id ?? null);
    setWireName(w.name);
    setWireTypeId(w.type_id ?? "");
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="wires" />
      <div className="admin-content max-w-4xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Wires</h1>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        {/* Wire types */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4">Tipe Wire</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {types.map((t) => (
              <span key={t.type_id} className="admin-chip">
                {t.name}
                <button onClick={() => { setEditingTypeId(t.type_id ?? null); setTypeName(t.name); }} title="Edit">
                  <Pencil size={13} className="text-gray-400 hover:text-[#021d47]" />
                </button>
                <button onClick={() => t.type_id && removeType(t.type_id)} disabled={deletingTypeId === t.type_id} title="Hapus">
                  {deletingTypeId === t.type_id ? (
                    <span className="admin-spinner-xs" style={{ width: "0.8rem", height: "0.8rem" }} />
                  ) : (
                    <Trash2 size={13} className="text-red-400 hover:text-red-600" />
                  )}
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Nama tipe (mis. SUS304)"
              className="admin-input flex-1"
            />
            <button onClick={saveType} disabled={savingType} className="admin-btn">
              {savingType ? <span className="admin-btn-spinner" /> : <Save size={14} />}
              {savingType ? "Menyimpan…" : editingTypeId ? "Update" : "Tambah"}
            </button>
            {editingTypeId && (
              <button onClick={() => { setEditingTypeId(null); setTypeName(""); }} className="admin-btn-ghost">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Wire add/edit */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingWireId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingWireId ? "Edit Wire" : "Tambah Wire"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={wireName}
              onChange={(e) => setWireName(e.target.value)}
              placeholder="Nama wire (mis. Per Spiral 2.5mm)"
              className="admin-input"
            />
            <div className="admin-select-wrap">
              <select
                value={wireTypeId}
                onChange={(e) => setWireTypeId(e.target.value)}
                className="admin-input"
              >
                <option value="">— Tanpa tipe —</option>
                {types.map((t) => (
                  <option key={t.type_id} value={t.type_id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveWire} disabled={savingWire} className="admin-btn">
              {savingWire ? <span className="admin-btn-spinner" /> : <Save size={14} />}
              {savingWire ? "Menyimpan…" : editingWireId ? "Update" : "Simpan"}
            </button>
            {editingWireId && (
              <button onClick={() => { setEditingWireId(null); setWireName(""); setWireTypeId(""); }} className="admin-btn-ghost">
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Wire list */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tipe</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {wires.length === 0 ? (
                <tr>
                  <td colSpan={3} className="!text-center py-10 text-gray-400 italic">
                    Belum ada wire.
                  </td>
                </tr>
              ) : (
                wires.map((w) => (
                  <tr key={w.wire_id}>
                    <td className="font-medium text-gray-800">{w.name}</td>
                    <td className="text-gray-600">{typeNameOf(w.type_id)}</td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEditWire(w)} className="text-gray-400 hover:text-[#021d47] transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => w.wire_id && removeWire(w.wire_id)} disabled={deletingWireId === w.wire_id} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60" title="Hapus">
                          {deletingWireId === w.wire_id ? (
                            <span className="admin-spinner-xs" />
                          ) : (
                            <Trash2 size={15} />
                          )}
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
