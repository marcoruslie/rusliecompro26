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
    <div
      className="min-h-screen px-6 py-10"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <p className="text-[0.7rem] tracking-widest uppercase text-gray-400">
              Ruslie Spring Admin
            </p>
            <h1
              className="text-2xl font-bold"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/transactions/new"
              className="flex items-center gap-1.5 text-white text-sm font-semibold px-4 py-2 rounded-lg"
              style={{ background: "#021d47" }}
            >
              <Plus size={15} /> New Transaction
            </Link>
            <Link
              href="/admin/customers"
              className="text-sm font-semibold px-4 py-2 rounded-lg border"
              style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
            >
              Customers
            </Link>
            <Link
              href="/admin/wires"
              className="text-sm font-semibold px-4 py-2 rounded-lg border"
              style={{ color: "#021d47", borderColor: "rgba(2,29,71,0.2)", background: "#fff" }}
            >
              Wires
            </Link>
            <AdminSignOutButton />
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Revenue (Bulan Ini)", value: rupiah(stats.month) },
            { label: "Revenue (Total)", value: rupiah(stats.all) },
            { label: "Jumlah Transaksi", value: String(stats.count) },
            { label: "Online / Direct", value: `${rupiah(stats.online)} / ${rupiah(stats.direct)}` },
          ].map((c) => (
            <div
              key={c.label}
              className="rounded-2xl bg-white p-5 shadow-sm"
              style={{ border: "1px solid rgba(2,29,71,0.08)" }}
            >
              <p className="text-[0.7rem] uppercase tracking-wider text-gray-400">{c.label}</p>
              <p className="text-lg font-bold mt-1" style={{ color: "#021d47" }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div
          className="rounded-2xl bg-white p-6 shadow-sm mb-8"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-2">Revenue per Bulan</p>
          <RevenueBarChart data={chartData} />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Cari (nama / no. invoice)</label>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Dari</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sampai</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#021d47]"
            />
          </div>
        </div>

        {/* Transaction list */}
        <div
          className="rounded-2xl bg-white shadow-sm overflow-x-auto"
          style={{ border: "1px solid rgba(2,29,71,0.08)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Tanggal</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">No. Invoice</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Customer</th>
                <th className="text-left p-3 font-semibold text-xs uppercase tracking-wider">Kategori</th>
                <th className="text-right p-3 font-semibold text-xs uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400 italic">
                    Tidak ada transaksi.
                  </td>
                </tr>
              ) : (
                filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => router.push(`/admin/transactions/${t.id}`)}
                    className="border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer"
                  >
                    <td className="p-3 text-gray-600">
                      {t.created_at ? t.created_at.slice(0, 10) : t.invoice_date}
                    </td>
                    <td className="p-3 font-medium text-gray-800">{t.invoice_number}</td>
                    <td className="p-3 text-gray-700">{t.customer?.name}</td>
                    <td className="p-3 text-gray-600 capitalize">
                      {t.channel === "online" ? "Online Shop" : "Direct"}
                    </td>
                    <td className="p-3 text-right font-semibold" style={{ color: "#021d47" }}>
                      {rupiah(t.total)}
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
