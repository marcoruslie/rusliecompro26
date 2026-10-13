"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Save, X, Pencil, Search, Coins, ChevronDown, ChevronRight } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  createEmployee,
  updateEmployee,
  softDeleteEmployee,
  listCommissionSource,
  summarizeCommissions,
  type EmployeeInput,
  type CommissionSummary,
} from "@/lib/employees";
import type { Employee } from "@/lib/types";

function formatCurrency(val: number): string {
  return val.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function EmployeesClient({
  initialEmployees,
}: {
  initialEmployees: Employee[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<Employee[]>(initialEmployees);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // draft
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  // commission recap
  const [month, setMonth] = useState(currentMonth());
  const [recap, setRecap] = useState<CommissionSummary[]>([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapError, setRecapError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = q
      ? rows.filter(
          (e) =>
            e.name.toLowerCase().includes(q) || (e.phone ?? "").toLowerCase().includes(q)
        )
      : rows;
    return [...base].sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, search]);

  useEffect(() => {
    if (!month) return;
    const [y, m] = month.split("-").map(Number);
    // Local-time month bounds, so a transaction made late on the 31st counts
    // in that month rather than slipping into the next one via UTC.
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 1);
    let cancelled = false;
    setRecapLoading(true);
    setRecapError("");
    listCommissionSource(supabase, from, to)
      .then((src) => {
        if (!cancelled) setRecap(summarizeCommissions(src, rows));
      })
      .catch(() => {
        if (!cancelled) setRecapError("Gagal memuat rekap komisi.");
      })
      .finally(() => {
        if (!cancelled) setRecapLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supabase, month, rows]);

  const recapTotal = recap.reduce((acc, s) => acc + s.total_commission, 0);

  function resetDraft() {
    setEditingId(null);
    setName("");
    setPhone("");
    setIsActive(true);
  }

  function startEdit(e: Employee) {
    setEditingId(e.id ?? null);
    setName(e.name);
    setPhone(e.phone ?? "");
    setIsActive(e.is_active);
  }

  async function save() {
    setError("");
    if (!name.trim()) { setError("Nama karyawan wajib diisi."); return; }
    const payload: EmployeeInput = {
      name: name.trim(),
      phone: phone.trim() || null,
      is_active: isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const u = await updateEmployee(supabase, editingId, payload);
        setRows((prev) => prev.map((e) => (e.id === editingId ? u : e)));
      } else {
        const c = await createEmployee(supabase, payload);
        setRows((prev) => [...prev, c]);
      }
      resetDraft();
    } catch (e: unknown) {
      const msg = (e as { code?: string })?.code === "23505"
        ? "Nama karyawan sudah ada."
        : "Gagal menyimpan karyawan.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(e: Employee) {
    if (!e.id) return;
    setError("");
    if (!confirm("Hapus karyawan ini? Riwayat komisi di transaksi lama tetap tersimpan.")) return;
    setDeletingId(e.id);
    try {
      await softDeleteEmployee(supabase, e.id);
      setRows((prev) => prev.filter((x) => x.id !== e.id));
      if (editingId === e.id) resetDraft();
    } catch {
      setError("Gagal menghapus karyawan.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px] lg:pt-10">
      <AdminNav active="employees" />
      <div className="admin-content max-w-4xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Karyawan</h1>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        {/* Add / edit form */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            {editingId ? <Pencil size={14} /> : <Plus size={14} />}
            {editingId ? "Edit Karyawan" : "Tambah Karyawan"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama karyawan"
              className="admin-input"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="No. HP (opsional)"
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

        {/* Search */}
        <div className="mb-4 relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / no. HP…"
            className="admin-input pl-9"
          />
        </div>

        {/* List */}
        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto mb-10">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>No. HP</th>
                <th>Status</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="!text-center py-10 text-gray-400 italic">
                    {rows.length === 0 ? "Belum ada karyawan." : "Tidak ada hasil pencarian."}
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium text-gray-800">{e.name}</td>
                    <td className="text-gray-500">{e.phone ?? "—"}</td>
                    <td>
                      <span className={e.is_active ? "admin-badge-green" : "admin-badge-gray"}>
                        {e.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-3 justify-end">
                        <button onClick={() => startEdit(e)} className="text-gray-400 hover:text-[#021d47] transition-colors" title="Edit">
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => remove(e)} disabled={deletingId === e.id} className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60" title="Hapus">
                          {deletingId === e.id ? <span className="admin-spinner-xs" /> : <Trash2 size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Commission recap */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4 admin-rise">
          <div>
            <p className="admin-eyebrow">Rekap</p>
            <h2 className="admin-title text-2xl mt-1 flex items-center gap-2">
              <Coins size={20} /> Komisi Karyawan
            </h2>
          </div>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="admin-input !w-auto"
          />
        </div>

        {recapError && <p className="admin-error mb-4">⚠ {recapError}</p>}

        <div className="admin-panel admin-rise rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Karyawan</th>
                <th className="!text-right">Total Pcs</th>
                <th className="!text-right">Total Komisi</th>
              </tr>
            </thead>
            <tbody>
              {recapLoading ? (
                <tr>
                  <td colSpan={4} className="!text-center py-10 text-gray-400">
                    <span className="admin-spinner-xs" /> Memuat…
                  </td>
                </tr>
              ) : recap.length === 0 ? (
                <tr>
                  <td colSpan={4} className="!text-center py-10 text-gray-400 italic">
                    Belum ada item dengan karyawan di bulan ini.
                  </td>
                </tr>
              ) : (
                recap.map((s) => {
                  const open = expandedId === s.employee_id;
                  return (
                    <Fragment key={s.employee_id}>
                      <tr
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => setExpandedId(open ? null : s.employee_id)}
                      >
                        <td className="text-gray-400">
                          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </td>
                        <td className="font-medium text-gray-800">{s.employee_name}</td>
                        <td className="!text-right text-gray-700">{s.total_qty}</td>
                        <td className="!text-right font-semibold text-[#021d47]">
                          Rp{formatCurrency(s.total_commission)}
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td></td>
                          <td colSpan={3} className="!pt-0">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-400 text-left">
                                  <th className="py-1.5 font-medium">Tanggal</th>
                                  <th className="py-1.5 font-medium">Invoice</th>
                                  <th className="py-1.5 font-medium">Item</th>
                                  <th className="py-1.5 font-medium text-right">Qty</th>
                                  <th className="py-1.5 font-medium text-right">Komisi/pcs</th>
                                  <th className="py-1.5 font-medium text-right">Subtotal</th>
                                </tr>
                              </thead>
                              <tbody>
                                {s.lines.map((l, i) => (
                                  <tr key={i} className="border-t border-gray-100 text-gray-600">
                                    <td className="py-1.5">{l.created_at.slice(0, 10)}</td>
                                    <td className="py-1.5">
                                      <Link
                                        href={`/admin/transactions/${l.transaction_id}`}
                                        className="text-blue-600 hover:underline"
                                      >
                                        {l.invoice_number || "—"}
                                      </Link>
                                      {l.customer_name && (
                                        <span className="block text-gray-400">{l.customer_name}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5">{l.item_name}</td>
                                    <td className="py-1.5 text-right">{l.qty}</td>
                                    <td className="py-1.5 text-right">
                                      Rp{formatCurrency(l.commission_per_pcs)}
                                    </td>
                                    <td className="py-1.5 text-right font-medium text-gray-800">
                                      Rp{formatCurrency(l.qty * l.commission_per_pcs)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
            {!recapLoading && recap.length > 0 && (
              <tfoot>
                <tr>
                  <td></td>
                  <td colSpan={2} className="font-semibold text-gray-700">Total</td>
                  <td className="!text-right font-bold text-[#021d47]">
                    Rp{formatCurrency(recapTotal)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
