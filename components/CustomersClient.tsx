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
    <div className="admin-shell px-6 py-10">
      <div className="admin-content max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 admin-rise">
          <div>
            <p className="admin-eyebrow">Ruslie Spring Admin</p>
            <h1 className="admin-title text-3xl mt-1">Customers</h1>
          </div>
          <Link href="/admin/dashboard" className="admin-btn-ghost">
            ← Dashboard
          </Link>
        </div>

        {/* Add / edit form */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Customer" : "Tambah Customer"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Nama lengkap customer"
              className="admin-input"
            />
            <input
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
              placeholder="No. telp (mis. 0812…)"
              className="admin-input"
            />
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Alamat lengkap"
              className="admin-input sm:col-span-2"
            />
            <input
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Kota / kode pos"
              className="admin-input sm:col-span-2"
            />
          </div>
          {error && <p className="admin-error mt-3">⚠ {error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={busy} className="admin-btn">
              <Save size={14} /> {busy ? "Menyimpan…" : "Simpan"}
            </button>
            {editingId && (
              <button onClick={resetForm} className="admin-btn-ghost">
                <X size={14} /> Batal
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kota</th>
                <th>No. Telp</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="!text-center py-10 text-gray-400 italic">
                    Belum ada customer.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium text-gray-800">{c.name}</td>
                    <td className="text-gray-600">{c.city}</td>
                    <td className="text-gray-600">{c.phone}</td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => startEdit(c)}
                          className="text-gray-400 hover:text-[#021d47] transition-colors"
                          title="Edit"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => c.id && handleDelete(c.id)}
                          className="text-red-400 hover:text-red-600 transition-colors"
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
