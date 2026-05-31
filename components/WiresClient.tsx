"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
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
    }
  }

  async function removeType(id: string) {
    if (!confirm("Hapus tipe ini? Wire yang memakainya akan kehilangan tipe.")) return;
    try {
      await deleteWireType(supabase, id);
      setTypes((prev) => prev.filter((t) => t.type_id !== id));
    } catch {
      setError("Gagal menghapus tipe.");
    }
  }

  /* ── Wires ── */
  async function saveWire() {
    setError("");
    if (!wireName.trim()) { setError("Nama wire wajib diisi."); return; }
    const payload = { name: wireName.trim(), type_id: wireTypeId || null };
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
    }
  }

  async function removeWire(id: string) {
    if (!confirm("Hapus wire ini?")) return;
    try {
      await deleteWire(supabase, id);
      setWires((prev) => prev.filter((w) => w.wire_id !== id));
    } catch {
      setError("Gagal menghapus wire.");
    }
  }

  function startEditWire(w: Wire) {
    setEditingWireId(w.wire_id ?? null);
    setWireName(w.name);
    setWireTypeId(w.type_id ?? "");
  }

  return (
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[0.7rem] tracking-widest uppercase text-gray-400">
              Ruslie Spring Admin
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              Wires
            </h1>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-sm font-semibold px-4 py-2 rounded-lg border"
            style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
          >
            ← Dashboard
          </Link>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">⚠ {error}</p>}

        {/* Wire types */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3">Tipe Wire</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {types.map((t) => (
              <span
                key={t.type_id}
                className="flex items-center gap-2 text-sm bg-blue-50 text-[#021d47] px-3 py-1.5 rounded-lg"
              >
                {t.name}
                <button onClick={() => { setEditingTypeId(t.type_id ?? null); setTypeName(t.name); }} title="Edit">
                  <Pencil size={13} className="text-gray-400 hover:text-[#021d47]" />
                </button>
                <button onClick={() => t.type_id && removeType(t.type_id)} title="Hapus">
                  <Trash2 size={13} className="text-red-400 hover:text-red-600" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={typeName}
              onChange={(e) => setTypeName(e.target.value)}
              placeholder="Nama tipe (mis. SUS304)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <button
              onClick={saveType}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {editingTypeId ? "Update" : "Tambah"}
            </button>
            {editingTypeId && (
              <button
                onClick={() => { setEditingTypeId(null); setTypeName(""); }}
                className="flex items-center gap-1.5 text-gray-500 text-sm px-3 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Wire add/edit */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3 flex items-center gap-2">
            {editingWireId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingWireId ? "Edit Wire" : "Tambah Wire"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={wireName}
              onChange={(e) => setWireName(e.target.value)}
              placeholder="Nama wire"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <select
              value={wireTypeId}
              onChange={(e) => setWireTypeId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            >
              <option value="">— Tanpa tipe —</option>
              {types.map((t) => (
                <option key={t.type_id} value={t.type_id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={saveWire}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {editingWireId ? "Update" : "Simpan"}
            </button>
            {editingWireId && (
              <button
                onClick={() => { setEditingWireId(null); setWireName(""); setWireTypeId(""); }}
                className="flex items-center gap-1.5 text-gray-500 text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* Wire list */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Tipe</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {wires.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-10 text-gray-400 italic">
                    Belum ada wire.
                  </td>
                </tr>
              ) : (
                wires.map((w) => (
                  <tr key={w.wire_id} className="border-b border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{w.name}</td>
                    <td className="p-3 text-gray-600">{typeNameOf(w.type_id)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEditWire(w)} className="text-gray-400 hover:text-[#021d47]" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => w.wire_id && removeWire(w.wire_id)} className="text-red-400 hover:text-red-600" title="Hapus">
                          <Trash2 size={15} />
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
