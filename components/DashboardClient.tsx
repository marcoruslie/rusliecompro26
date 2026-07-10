"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  deleteTransaction,
  getInvoiceItems,
  type DashboardTransaction,
  type InvoiceItemsDetail,
} from "@/lib/transactions";
import AdminNav from "@/components/AdminNav";
import RevenueBarChart, { BarDatum } from "@/components/RevenueBarChart";

const PAGE_SIZE = 50;

// Per-invoice item detail is fetched lazily when a row is expanded. Cache each
// result by id so re-expanding is instant; the sentinel states drive the UI.
type DetailState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: InvoiceItemsDetail };

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
  // Seed the prop into local state so deleting a row updates the stats, chart,
  // and list in place — no full reload — and correctly drops duplicates from totals.
  const [rows, setRows] = useState<DashboardTransaction[]>(transactions);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  // Which invoice's items are expanded, plus a per-id cache of the lazy fetch.
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailState>>({});
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

  async function fetchDetail(id: string) {
    setDetails((prev) => ({ ...prev, [id]: { status: "loading" } }));
    const supabase = createClient();
    try {
      const data = await getInvoiceItems(supabase, id);
      setDetails((prev) => ({ ...prev, [id]: { status: "ready", data } }));
    } catch {
      setDetails((prev) => ({ ...prev, [id]: { status: "error" } }));
    }
  }

  function toggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    // Fetch once per id; a prior error stays cached until an explicit retry.
    if (!details[id]) fetchDetail(id);
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

        {/* Invoice list */}
        <div className="flex items-center justify-between mb-3">
          <p className="admin-panel-heading">Daftar Invoice</p>
          <span className="text-xs text-gray-400">{filtered.length} invoice</span>
        </div>
        <div className="admin-panel rounded-2xl overflow-hidden">
          {filtered.length === 0 ? (
            <p className="text-center py-12 text-gray-400 italic">Tidak ada transaksi.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {pageRows.map((t) => {
                const open = expandedId === t.id;
                const online = t.channel === "online";
                const detail = details[t.id];
                return (
                  <li key={t.id}>
                    {/* Card header — click toggles the item detail */}
                    <div
                      onClick={() => toggleExpand(t.id)}
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <ChevronDown
                        size={16}
                        className={`shrink-0 text-gray-400 transition-transform ${
                          open ? "" : "-rotate-90"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/admin/transactions/${t.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold text-[#021d47] hover:underline"
                            title="Buka invoice"
                          >
                            {t.invoice_number}
                          </Link>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
                              online
                                ? "bg-blue-50 text-blue-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                online ? "bg-blue-500" : "bg-slate-400"
                              }`}
                            />
                            {online ? "Online Shop" : "Direct"}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          {(t.created_at ? t.created_at.slice(0, 10) : t.invoice_date)} ·{" "}
                          {t.customer?.name}
                        </p>
                      </div>
                      <span className="font-semibold text-[#021d47] whitespace-nowrap">
                        {rupiah(t.total)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.id);
                        }}
                        disabled={deletingId === t.id}
                        className="shrink-0 text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                        title="Hapus transaksi"
                        aria-label="Hapus transaksi"
                      >
                        {deletingId === t.id ? (
                          <span className="admin-spinner-xs" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>

                    {/* Expanded item detail (lazy-loaded) */}
                    {open && (
                      <div className="px-4 pb-4 pl-11 bg-gray-50/60">
                        {(!detail || detail.status === "loading") && (
                          <div className="flex items-center gap-2 py-3 text-sm text-gray-400">
                            <span className="admin-spinner-xs" /> Memuat item…
                          </div>
                        )}
                        {detail?.status === "error" && (
                          <div className="py-3 text-sm text-red-500">
                            Gagal memuat item.{" "}
                            <button
                              onClick={() => fetchDetail(t.id)}
                              className="underline font-medium"
                            >
                              Coba lagi
                            </button>
                          </div>
                        )}
                        {detail?.status === "ready" && (
                          <div className="pt-3">
                            {detail.data.items.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">Tidak ada item.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {detail.data.items.map((it, i) => (
                                  <div
                                    key={i}
                                    className="flex items-baseline gap-2 text-sm"
                                  >
                                    <span className="flex-1 text-gray-700 min-w-0 truncate">
                                      {it.name}
                                    </span>
                                    <span className="text-gray-400 tabular-nums whitespace-nowrap">
                                      {it.qty} × {rupiah(it.price)}
                                    </span>
                                    <span className="w-28 text-right font-medium text-gray-700 tabular-nums">
                                      {rupiah(it.qty * it.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 pt-2 border-t border-gray-200 text-sm space-y-1">
                              {detail.data.shipping > 0 && (
                                <div className="flex justify-between text-gray-500">
                                  <span>Ongkir</span>
                                  <span className="tabular-nums">
                                    {rupiah(detail.data.shipping)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between font-semibold text-[#021d47]">
                                <span>Total</span>
                                <span className="tabular-nums">{rupiah(detail.data.total)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
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
