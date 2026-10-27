"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronLeft, ChevronRight } from "lucide-react";
import TkaShell from "./TkaShell";
import { DOC_BY_JNL } from "@/lib/tka/docs";
import { db, errMsg, lookups, type Doc } from "@/lib/tka/data";
import { fmtDate, fmtNum, NAMA_BULAN } from "@/lib/tka/format";

const PAGE = 50;

export default function DocListClient({ jnl }: { jnl: string }) {
  const cfg = DOC_BY_JNL[jnl];
  const router = useRouter();
  const [years, setYears] = useState<number[]>([]);
  const [tahun, setTahun] = useState<number>(new Date().getFullYear());
  const [bulan, setBulan] = useState<number>(0);
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Doc[]>([]);
  const [count, setCount] = useState(0);
  const [sumTotal, setSumTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    lookups.tahun().then(setYears).catch((e) => setError(errMsg(e)));
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    let query = db()
      .from("tka_doc")
      .select("id,jnl,tahun,nomor,tanggal,sub,subname,total,rem,h,legacy,chuser", { count: "exact" })
      .eq("jnl", jnl)
      .eq("tahun", tahun);
    if (bulan) {
      const from = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
      const to = new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10);
      query = query.gte("tanggal", from).lte("tanggal", to);
    }
    if (search) {
      const s = search.replace(/[%,()]/g, " ").trim();
      query = query.or(`nomor.ilike.%${s}%,subname.ilike.%${s}%,sub.ilike.%${s}%,rem.ilike.%${s}%`);
    }
    query
      .order("tanggal", { ascending: false })
      .order("nomor", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
      .then(({ data, error, count }) => {
        if (!alive) return;
        if (error) setError(error.message);
        setRows((data ?? []) as Doc[]);
        setCount(count ?? 0);
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [jnl, tahun, bulan, search, page]);

  // Period total (sum over all pages) — cheap enough via an aggregate-free page scan of totals.
  useEffect(() => {
    let alive = true;
    setSumTotal(null);
    (async () => {
      let total = 0;
      for (let from = 0; ; from += 1000) {
        let qy = db().from("tka_doc").select("total").eq("jnl", jnl).eq("tahun", tahun);
        if (bulan) {
          qy = qy
            .gte("tanggal", `${tahun}-${String(bulan).padStart(2, "0")}-01`)
            .lte("tanggal", new Date(Date.UTC(tahun, bulan, 0)).toISOString().slice(0, 10));
        }
        const { data, error } = await qy.range(from, from + 999);
        if (error || !data) return;
        total += data.reduce((s, r) => s + Number(r.total), 0);
        if (data.length < 1000) break;
      }
      if (alive) setSumTotal(total);
    })();
    return () => {
      alive = false;
    };
  }, [jnl, tahun, bulan]);

  if (!cfg) return null;
  const pages = Math.max(1, Math.ceil(count / PAGE));
  const showTotal = !["BPB", "BBK"].includes(jnl);

  return (
    <TkaShell
      active={`dok-${jnl}`}
      title={cfg.title}
      eyebrow={`TKA · ${cfg.group}`}
      actions={
        <Link href={`/admin/tka/dok/${jnl}/baru`} className="admin-btn">
          <Plus size={14} /> Tambah
        </Link>
      }
    >
      <div className="admin-panel rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="admin-label">Tahun</label>
          <select className="admin-input w-28" value={tahun} onChange={(e) => { setTahun(Number(e.target.value)); setPage(0); }}>
            {(years.length ? years : [tahun]).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="admin-label">Bulan</label>
          <select className="admin-input w-36" value={bulan} onChange={(e) => { setBulan(Number(e.target.value)); setPage(0); }}>
            <option value={0}>Semua</option>
            {NAMA_BULAN.map((b, i) => (
              <option key={b} value={i + 1}>{b}</option>
            ))}
          </select>
        </div>
        <form
          className="flex-1 min-w-[220px]"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q);
            setPage(0);
          }}
        >
          <label className="admin-label">Cari nomor / nama / keterangan</label>
          <div className="flex gap-2">
            <input className="admin-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="mis. MH012, MASPION…" />
            <button className="admin-btn-ghost" type="submit"><Search size={14} /></button>
          </div>
        </form>
        {showTotal && (
          <div className="text-right">
            <p className="admin-label">Total periode</p>
            <p className="admin-stat-value text-lg">{sumTotal == null ? "…" : fmtNum(sumTotal)}</p>
          </div>
        )}
      </div>

      {error && <p className="admin-error mb-3">⚠ {error}</p>}

      <div className="admin-panel rounded-2xl overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nomor</th>
              <th>Tanggal</th>
              {cfg.sub && <th>{cfg.subLabel}</th>}
              <th>Keterangan</th>
              {showTotal && <th className="!text-right">Total</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="!text-center py-10 text-gray-400">Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="!text-center py-10 text-gray-400 italic">Belum ada data.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="cursor-pointer" onClick={() => router.push(`/admin/tka/dok/${jnl}/${r.id}`)}>
                  <td className="font-mono text-[0.8rem] text-[#021d47] whitespace-nowrap">{r.nomor}</td>
                  <td className="whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                  {cfg.sub && (
                    <td>
                      <span className="text-gray-800">{r.subname}</span>
                      {r.sub && <span className="ml-2 text-[0.7rem] text-gray-400">{r.sub}</span>}
                    </td>
                  )}
                  <td className="text-gray-500 max-w-[320px] truncate">{r.rem}</td>
                  {showTotal && <td className="!text-right tabular-nums whitespace-nowrap">{fmtNum(r.total)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
        <span>{count.toLocaleString("id-ID")} dokumen</span>
        <div className="flex items-center gap-2">
          <button className="admin-btn-ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></button>
          <span>{page + 1} / {pages}</span>
          <button className="admin-btn-ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></button>
        </div>
      </div>
    </TkaShell>
  );
}
