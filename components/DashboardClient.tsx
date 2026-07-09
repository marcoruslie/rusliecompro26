"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { deleteTransaction, type DashboardTransaction } from "@/lib/transactions";
import AdminNav from "@/components/AdminNav";
import RevenueBarChart, { BarDatum } from "@/components/RevenueBarChart";

const PAGE_SIZE = 50;

function rupiah(val: number): string {
  return "Rp" + (val || 0).toLocaleString("id-ID");
}

function monthKey(iso: string): string {
  // Use the stored ISO string's YYYY-MM directly so this matches the date-string
  // filtering below (both UTC), avoiding a month-boundary mismatch in local timezones.
  return iso.slice(0, 7);
}

export default function DashboardClient({
  transactions,
}: {
  transactions: DashboardTransaction[];
}) {
  const router = useRouter();
  // Seed the prop into local state so deleting a row updates the stats, chart,
  // and list in place — no full reload — and correctly drops duplicates from totals.
  const [rows, setRows] = useState<DashboardTransaction[]>(transactions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Keep the input responsive: the expensive table filter reads the deferred
  // value so typing never blocks on re-filtering the full list (better INP).
  const deferredSearch = useDeferredValue(search);

  const thisMonthKey = new Date().toISOString().slice(0, 7);

  async function handleDelete(id: string) {
    if (!confirm("Hapus transaksi ini secara permanen?")) return;
    setDeletingId(id);
    const supabase = createClient();
    try {
      await deleteTransaction(supabase, id);
      setRows((prev) => prev.filter((t) => t.id !== id));
    } catch {
      alert("Gagal menghapus transaksi. Coba lagi.");
    } finally {
      setDeletingId(null);
    }
  }

  const stats = useMemo(() => {
    const all = rows.reduce((s, t) => s + (t.total || 0), 0);
    const month = rows
      .filter((t) => t.created_at && monthKey(t.created_at) === thisMonthKey)
      .reduce((s, t) => s + (t.total || 0), 0);
    const online = rows
      .filter((t) => t.channel === "online")
      .reduce((s, t) => s + (t.total || 0), 0);
    const direct = rows
      .filter((t) => t.channel === "direct")
      .reduce((s, t) => s + (t.total || 0), 0);
    return { all, month, online, direct, count: rows.length };
  }, [rows, thisMonthKey]);

  const chartData: BarDatum[] = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const t of rows) {
      if (!t.created_at) continue;
      const k = monthKey(t.created_at);
      byMonth.set(k, (byMonth.get(k) ?? 0) + (t.total || 0));
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, value]) => ({ label: label.slice(2), value }));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    return rows.filter((t) => {
      const matchesSearch =
        !q ||
        t.customer?.name?.toLowerCase().includes(q) ||
        t.invoice_number?.toLowerCase().includes(q);
      const created = t.created_at ? t.created_at.slice(0, 10) : "";
      const matchesFrom = !from || created >= from;
      const matchesTo = !to || created <= to;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [rows, deferredSearch, from, to]);

  // Paginate the rendered table so the DOM stays small as history grows;
  // stats, chart, and search still operate on the full list.
  const [page, setPage] = useState(0);
  useEffect(() => {
    setPage(0); // new filter set → back to the first page
  }, [deferredSearch, from, to]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px]">
      <AdminNav active="dashboard" />
      <div className="admin-content max-w-6xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Dashboard</h1>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenue · Bulan Ini", value: rupiah(stats.month), accent: true },
            { label: "Revenue · Total", value: rupiah(stats.all) },
            { label: "Jumlah Transaksi", value: String(stats.count) },
            { label: "Online / Direct", value: `${rupiah(stats.online)} / ${rupiah(stats.direct)}` },
          ].map((c, i) => (
            <div
              key={c.label}
              className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5"
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <p className="admin-label mb-2">{c.label}</p>
              <p className={`admin-stat-value ${c.accent ? "text-2xl" : "text-xl"}`}>{c.value}</p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-6 mb-8">
          <p className="admin-panel-heading mb-2">Revenue per Bulan</p>
          <RevenueBarChart data={chartData} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="admin-label">Cari (nama / no. invoice)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ketik nama atau nomor invoice…"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Tanggal mulai"
              className="admin-input"
            />
          </div>
          <div>
            <label className="admin-label">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Tanggal akhir"
              className="admin-input"
            />
          </div>
        </div>

        {/* Transaction list */}
        <div className="admin-panel rounded-2xl overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>No. Invoice</th>
                <th>Customer</th>
                <th>Kategori</th>
                <th className="!text-right">Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!text-center py-10 text-gray-400 italic">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                pageRows.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/transactions/${t.id}`)}
                    className="cursor-pointer"
                  >
                    <td className="text-gray-500">
                      {t.created_at ? t.created_at.slice(0, 10) : t.invoice_date}
                    </td>
                    <td className="font-medium text-gray-800">{t.invoice_number}</td>
                    <td className="text-gray-700">{t.customer?.name}</td>
                    <td className="capitalize text-gray-500">
                      {t.channel === "online" ? "Online Shop" : "Direct"}
                    </td>
                    <td className="!text-right font-semibold text-[#021d47]">{rupiah(t.total)}</td>
                    <td className="!text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deletingId === t.id}
                        className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                        title="Hapus transaksi"
                        aria-label="Hapus transaksi"
                      >
                        {deletingId === t.id ? (
                          <span className="admin-spinner-xs" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filtered.length > PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                {safePage * PAGE_SIZE + 1}–
                {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} dari{" "}
                {filtered.length} transaksi
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(safePage - 1)}
                  disabled={safePage === 0}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:text-[#021d47] hover:border-gray-300 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  ‹ Prev
                </button>
                <span className="text-xs text-gray-500 tabular-nums">
                  {safePage + 1} / {pageCount}
                </span>
                <button
                  onClick={() => setPage(safePage + 1)}
                  disabled={safePage >= pageCount - 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:text-[#021d47] hover:border-gray-300 disabled:opacity-40 disabled:cursor-default transition-colors"
                >
                  Next ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
