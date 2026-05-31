"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { Transaction } from "@/lib/types";
import AdminSignOutButton from "@/components/AdminSignOutButton";
import RevenueBarChart, { BarDatum } from "@/components/RevenueBarChart";

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
  transactions: Transaction[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const thisMonthKey = new Date().toISOString().slice(0, 7);

  const stats = useMemo(() => {
    const all = transactions.reduce((s, t) => s + (t.total || 0), 0);
    const month = transactions
      .filter((t) => t.created_at && monthKey(t.created_at) === thisMonthKey)
      .reduce((s, t) => s + (t.total || 0), 0);
    const online = transactions
      .filter((t) => t.channel === "online")
      .reduce((s, t) => s + (t.total || 0), 0);
    const direct = transactions
      .filter((t) => t.channel === "direct")
      .reduce((s, t) => s + (t.total || 0), 0);
    return { all, month, online, direct, count: transactions.length };
  }, [transactions, thisMonthKey]);

  const chartData: BarDatum[] = useMemo(() => {
    const byMonth = new Map<string, number>();
    for (const t of transactions) {
      if (!t.created_at) continue;
      const k = monthKey(t.created_at);
      byMonth.set(k, (byMonth.get(k) ?? 0) + (t.total || 0));
    }
    return Array.from(byMonth.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([label, value]) => ({ label: label.slice(2), value }));
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesSearch =
        !search ||
        t.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        t.invoice_number?.toLowerCase().includes(search.toLowerCase());
      const created = t.created_at ? t.created_at.slice(0, 10) : "";
      const matchesFrom = !from || created >= from;
      const matchesTo = !to || created <= to;
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [transactions, search, from, to]);

  return (
    <div className="admin-shell px-6 py-10">
      <div className="admin-content max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4 admin-rise">
          <div>
            <p className="admin-eyebrow">Ruslie Spring · Control Panel</p>
            <h1 className="admin-title text-3xl mt-1">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Link href="/admin/transactions/new" className="admin-btn">
              <Plus size={15} /> New Transaction
            </Link>
            <Link href="/admin/customers" className="admin-btn-ghost">
              Customers
            </Link>
            <Link href="/admin/wires" className="admin-btn-ghost">
              Wires
            </Link>
            <AdminSignOutButton />
          </div>
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
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="!text-center py-10 text-slate-500 italic">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/transactions/${t.id}`)}
                    className="cursor-pointer"
                  >
                    <td className="font-mono text-slate-400">
                      {t.created_at ? t.created_at.slice(0, 10) : t.invoice_date}
                    </td>
                    <td className="font-mono font-medium text-cyan-200">{t.invoice_number}</td>
                    <td className="text-slate-100">{t.customer?.name}</td>
                    <td className="capitalize text-slate-400">
                      {t.channel === "online" ? "Online Shop" : "Direct"}
                    </td>
                    <td className="!text-right font-semibold text-cyan-300">{rupiah(t.total)}</td>
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
