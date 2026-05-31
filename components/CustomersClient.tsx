"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, X, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { createCustomer, updateCustomer, deleteCustomer } from "@/lib/customers";
import type { Customer } from "@/lib/types";

const EMPTY: Customer = { name: "", address: "", city: "", phone: "" };

export default function CustomersClient({
  initialCustomers,
}: {
  initialCustomers: Customer[];
}) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [draft, setDraft] = useState<Customer>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function resetForm() {
    setDraft(EMPTY);
    setEditingId(null);
    setError("");
  }

  async function handleSave() {
    setError("");
    if (!draft.name.trim()) {
      setError("Nama wajib diisi.");
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const payload = {
      name: draft.name,
      address: draft.address,
      city: draft.city,
      phone: draft.phone,
    };
    try {
      if (editingId) {
        const updated = await updateCustomer(supabase, editingId, payload);
        setCustomers((prev) => prev.map((c) => (c.id === editingId ? updated : c)));
      } else {
        const created = await createCustomer(supabase, payload);
        setCustomers((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      resetForm();
    } catch {
      setError("Gagal menyimpan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Hapus customer ini?")) return;
    const supabase = createClient();
    try {
      await deleteCustomer(supabase, id);
      setCustomers((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) resetForm();
    } catch {
      setError("Gagal menghapus. Coba lagi.");
    }
  }

  function startEdit(c: Customer) {
    setEditingId(c.id ?? null);
    setDraft({ name: c.name, address: c.address, city: c.city, phone: c.phone });
    setError("");
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
              Customers
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

        {/* Add / edit form */}
        <div
          className="rounded-2xl bg-white p-5 shadow-sm mb-6"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-3 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Customer" : "Tambah Customer"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nama"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="No. Telp"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Alamat"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47] sm:col-span-2"
            />
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Kota"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47] sm:col-span-2"
            />
          </div>
          {error && <p className="text-red-500 text-xs mt-2">⚠ {error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={busy}
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-60"
              style={{ background: "#021d47" }}
            >
              <Save size={14} /> {busy ? "Menyimpan…" : "Simpan"}
            </button>
            {editingId && (
              <button
                onClick={resetForm}
                className="flex items-center gap-1.5 text-gray-500 text-sm font-medium px-4 py-2 rounded-lg border"
                style={{ borderColor: "rgba(2,29,71,0.12)" }}
              >
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Nama</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Kota</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">No. Telp</th>
                <th className="p-3 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-gray-400 italic">
                    Belum ada customer.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="p-3 font-medium text-gray-800">{c.name}</td>
                    <td className="p-3 text-gray-600">{c.city}</td>
                    <td className="p-3 text-gray-600">{c.phone}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-gray-400 hover:text-[#021d47]"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => c.id && handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600"
                          title="Hapus"
                        >
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
