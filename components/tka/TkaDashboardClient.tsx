"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import TkaShell from "./TkaShell";
import { db, errMsg, lookups, rpcAll } from "@/lib/tka/data";
import { fmtNum, NAMA_BULAN, todayISO } from "@/lib/tka/format";

type Month = { bulan: number; penjualan: number; pembelian: number; produksi: number; kas_masuk: number; kas_keluar: number };
type TB = { acc: string; name: string; akhir: number };

const QUICK = [
  { href: "/admin/tka/dok/JLH/baru", label: "Nota Penjualan" },
  { href: "/admin/tka/dok/POP/baru", label: "Order Partai" },
  { href: "/admin/tka/dok/BHP/baru", label: "Hasil Produksi" },
  { href: "/admin/tka/dok/KK/baru", label: "Kas Keluar" },
  { href: "/admin/tka/dok/KM/baru", label: "Kas Masuk" },
  { href: "/admin/tka/dok/BK/baru", label: "Bank Keluar" },
];

export default function TkaDashboardClient() {
  const [years, setYears] = useState<number[]>([]);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [months, setMonths] = useState<Month[]>([]);
  const [cash, setCash] = useState<TB[]>([]);
  const [piutang, setPiutang] = useState<number | null>(null);
  const [hutang, setHutang] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    lookups.tahun().then((ys) => {
      setYears(ys);
      // Fall back to the newest year with data when the current year is still empty.
      if (ys.length && !ys.includes(new Date().getFullYear())) setTahun(ys[0]);
    }).catch((e) => setError(errMsg(e)));
    const per = todayISO();
    rpcAll<{ sisa: number }>("tka_hp_outstanding", { p_id_cs: "C", p_per: per, p_sub: null })
      .then((r) => setPiutang(r.reduce((s, x) => s + Number(x.sisa), 0))).catch(() => {});
    rpcAll<{ sisa: number }>("tka_hp_outstanding", { p_id_cs: "S", p_per: per, p_sub: null })
      .then((r) => setHutang(r.reduce((s, x) => s + Number(x.sisa), 0))).catch(() => {});
  }, []);

  useEffect(() => {
    setMonths([]);
    db().rpc("tka_dashboard", { p_tahun: tahun }).then(({ data, error }) => {
      if (error) setError(error.message);
      setMonths((data ?? []) as Month[]);
    });
    const lastMonth = tahun === new Date().getFullYear() ? new Date().getMonth() + 1 : 12;
    rpcAll<TB>("tka_neraca_saldo", { p_tahun: tahun, p_dari: 1, p_sampai: lastMonth })
      .then((rows) => setCash(rows.filter((r) => /^1\.01\.0[12]\./.test(r.acc) && Math.abs(Number(r.akhir)) >= 1)))
      .catch((e) => setError(errMsg(e)));
  }, [tahun]);

  const sum = (k: keyof Month) => months.reduce((s, m) => s + Number(m[k]), 0);
  const maxJual = Math.max(1, ...months.map((m) => Number(m.penjualan)));
  const cashTotal = cash.reduce((s, r) => s + Number(r.akhir), 0);

  return (
    <TkaShell
      active="dashboard"
      title="Dashboard"
      eyebrow="TKA"
      actions={
        <select className="admin-input w-28" value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>
          {(years.length ? years : [tahun]).map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      }
    >
      {error && <p className="admin-error mb-3">⚠ {error}</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {[
          { label: `Penjualan ${tahun}`, v: sum("penjualan") },
          { label: `Pembelian ${tahun}`, v: sum("pembelian") },
          { label: "Piutang Outstanding", v: piutang },
          { label: "Hutang Outstanding", v: hutang },
        ].map((s) => (
          <div key={s.label} className="admin-panel rounded-2xl p-4">
            <p className="admin-label">{s.label}</p>
            <p className="admin-stat-value text-xl mt-1">{s.v == null ? "…" : fmtNum(s.v, 0)}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-4">
        <div className="admin-panel rounded-2xl p-5 lg:col-span-2 overflow-x-auto">
          <p className="admin-panel-heading mb-3">Per Bulan {tahun}</p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Bulan</th>
                <th className="!text-right">Penjualan</th>
                <th className="w-[22%]"></th>
                <th className="!text-right">Pembelian</th>
                <th className="!text-right">Produksi (HPP)</th>
                <th className="!text-right">Kas/Bank Masuk</th>
                <th className="!text-right">Kas/Bank Keluar</th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.bulan}>
                  <td>{NAMA_BULAN[m.bulan - 1]}</td>
                  <td className="!text-right tabular-nums">{fmtNum(m.penjualan, 0)}</td>
                  <td>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-[#021d47]" style={{ width: `${(Number(m.penjualan) / maxJual) * 100}%` }} />
                    </div>
                  </td>
                  <td className="!text-right tabular-nums">{fmtNum(m.pembelian, 0)}</td>
                  <td className="!text-right tabular-nums">{fmtNum(m.produksi, 0)}</td>
                  <td className="!text-right tabular-nums">{fmtNum(m.kas_masuk, 0)}</td>
                  <td className="!text-right tabular-nums">{fmtNum(m.kas_keluar, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="admin-panel rounded-2xl p-5">
            <p className="admin-panel-heading mb-3">Transaksi Baru</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK.map((q) => (
                <Link key={q.href} href={q.href} className="admin-btn-ghost !justify-start">
                  <Plus size={13} /> {q.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="admin-panel rounded-2xl p-5">
            <p className="admin-panel-heading mb-3">Saldo Kas & Bank</p>
            <ul className="space-y-1.5 text-sm">
              {cash.map((c) => (
                <li key={c.acc} className="flex justify-between gap-3">
                  <Link href={`/admin/tka/laporan/buku-besar?acc=${encodeURIComponent(c.acc)}&tahun=${tahun}`} className="text-slate-600 hover:text-[#021d47] truncate">
                    {c.name}
                  </Link>
                  <span className="tabular-nums">{fmtNum(c.akhir, 0)}</span>
                </li>
              ))}
              <li className="flex justify-between border-t border-slate-100 pt-1.5 font-semibold text-[#021d47]">
                <span>Total</span>
                <span className="tabular-nums">{fmtNum(cashTotal, 0)}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </TkaShell>
  );
}
