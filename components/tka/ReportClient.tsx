"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Printer, FileDown, ArrowLeft } from "lucide-react";
import TkaShell from "./TkaShell";
import Picker from "./Picker";
import { REPORT_BY_KEY, type Params, type ReportResult } from "@/lib/tka/reports";
import { errMsg, lookups, type Setting } from "@/lib/tka/data";
import { useLookups, invKey, type LookupKind } from "@/lib/tka/useLookups";
import { downloadCsv, fmtNum, NAMA_BULAN, todayISO } from "@/lib/tka/format";

function defaults(sp: URLSearchParams): Params {
  const today = todayISO();
  const y = Number(sp.get("tahun")) || new Date().getFullYear();
  const m = new Date().getMonth() + 1;
  const bulanSampai = Number(sp.get("bulanSampai")) || (y === new Date().getFullYear() ? m : 12);
  const bulanDari = Number(sp.get("bulanDari")) || 1;
  const dari = sp.get("dari") || (sp.get("tahun") ? `${y}-${String(bulanDari).padStart(2, "0")}-01` : `${today.slice(0, 8)}01`);
  const sampai = sp.get("sampai") || (sp.get("tahun") ? new Date(Date.UTC(y, bulanSampai, 0)).toISOString().slice(0, 10) : today);
  return {
    dari, sampai, per: sp.get("per") || today, tahun: y, bulanDari, bulanSampai,
    acc: sp.get("acc") || "", gol: sp.get("gol") || "", inv: sp.get("inv") || "",
    cus: sp.get("cus") || "", sup: sp.get("sup") || "", jenisStok: (sp.get("jenisStok") as Params["jenisStok"]) || "",
  };
}

export default function ReportClient({ reportKey }: { reportKey: string }) {
  const def = REPORT_BY_KEY[reportKey];
  const sp = useSearchParams();
  const router = useRouter();
  const [p, setP] = useState<Params>(() => defaults(new URLSearchParams(sp.toString())));
  const [years, setYears] = useState<number[]>([]);
  const [res, setRes] = useState<ReportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [setting, setSetting] = useState<Setting | null>(null);

  const kinds = useMemo<LookupKind[]>(
    () => def.params.filter((k) => ["acc", "inv", "cus", "sup"].includes(k)) as LookupKind[],
    [def]
  );
  const lk = useLookups(kinds);

  useEffect(() => {
    lookups.tahun().then(setYears).catch(() => {});
    lookups.setting().then(setSetting).catch(() => {});
  }, []);

  async function run(params = p) {
    setBusy(true);
    setError("");
    try {
      setRes(await def.run(params));
    } catch (e) {
      setRes(null);
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  // Auto-run when opened with parameters (drill-down links) or when nothing needs choosing.
  useEffect(() => {
    const needsPick = def.params.some((k) => (k === "acc" && !p.acc) || (k === "inv" && !p.inv) || ((k === "cus" || k === "sup") && def.key.startsWith("kartu") && !p[k]));
    if (!needsPick) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<Params>) => setP((x) => ({ ...x, ...patch }));

  function exportCsv() {
    if (!res) return;
    downloadCsv(
      `${def.key}.csv`,
      res.columns.map((c) => c.label),
      res.rows.map((r) => res.columns.map((c) => (c.num ? (r[c.key] === "" || r[c.key] == null ? "" : Number(r[c.key]).toFixed(2).replace(".", ",")) : String(r[c.key] ?? ""))))
    );
  }

  return (
    <TkaShell
      active="laporan"
      title={def.title}
      eyebrow={`TKA · Laporan · ${def.group}`}
      wide
      actions={
        <>
          <Link href="/admin/tka/laporan" className="admin-btn-ghost"><ArrowLeft size={14} /> Laporan</Link>
          {res && <button className="admin-btn-ghost" onClick={exportCsv}><FileDown size={14} /> CSV</button>}
          {res && <button className="admin-btn-ghost" onClick={() => window.print()}><Printer size={14} /> Cetak</button>}
        </>
      }
    >
      <div className="tka-report">
        <div className="no-print admin-panel rounded-2xl p-4 mb-4 flex flex-wrap items-end gap-3">
          {def.params.includes("tanggal") && (
            <>
              <div><label className="admin-label">Dari</label><input type="date" className="admin-input" value={p.dari} onChange={(e) => set({ dari: e.target.value })} /></div>
              <div><label className="admin-label">Sampai</label><input type="date" className="admin-input" value={p.sampai} onChange={(e) => set({ sampai: e.target.value })} /></div>
            </>
          )}
          {def.params.includes("per") && (
            <div><label className="admin-label">Per Tanggal</label><input type="date" className="admin-input" value={p.per} onChange={(e) => set({ per: e.target.value })} /></div>
          )}
          {(def.params.includes("periode") || def.params.includes("tahun")) && (
            <div>
              <label className="admin-label">Tahun</label>
              <select className="admin-input w-28" value={p.tahun} onChange={(e) => set({ tahun: Number(e.target.value) })}>
                {(years.length ? years : [p.tahun]).map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}
          {def.params.includes("periode") && (
            <>
              <div>
                <label className="admin-label">Dari Bulan</label>
                <select className="admin-input w-36" value={p.bulanDari} onChange={(e) => set({ bulanDari: Number(e.target.value) })}>
                  {NAMA_BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="admin-label">Sampai Bulan</label>
                <select className="admin-input w-36" value={p.bulanSampai} onChange={(e) => set({ bulanSampai: Number(e.target.value) })}>
                  {NAMA_BULAN.map((b, i) => <option key={b} value={i + 1}>{b}</option>)}
                </select>
              </div>
            </>
          )}
          {def.params.includes("jenisStok") && (
            <div>
              <label className="admin-label">Jenis</label>
              <select className="admin-input w-40" value={p.jenisStok} onChange={(e) => set({ jenisStok: e.target.value as Params["jenisStok"] })}>
                <option value="">Semua</option>
                <option value="F">Barang Jadi</option>
                <option value="R">Bahan Baku</option>
              </select>
            </div>
          )}
          {def.params.includes("acc") && (
            <div className="w-80"><label className="admin-label">Akun</label><Picker items={lk.acc} value={p.acc} onPick={(i) => set({ acc: i?.value ?? "" })} placeholder="Cari akun…" /></div>
          )}
          {def.params.includes("inv") && (
            <div className="w-80">
              <label className="admin-label">Barang</label>
              <Picker items={lk.inv} value={p.inv ? invKey(p.gol, p.inv) : ""} onPick={(i) => { const [gol, inv] = (i?.value ?? "|").split("|"); set({ gol, inv }); }} placeholder="Cari barang…" />
            </div>
          )}
          {def.params.includes("cus") && (
            <div className="w-72"><label className="admin-label">Customer</label><Picker items={lk.cus} value={p.cus} onPick={(i) => set({ cus: i?.value ?? "" })} placeholder="Semua / pilih customer" /></div>
          )}
          {def.params.includes("sup") && (
            <div className="w-72"><label className="admin-label">Supplier</label><Picker items={lk.sup} value={p.sup} onPick={(i) => set({ sup: i?.value ?? "" })} placeholder="Semua / pilih supplier" /></div>
          )}
          <button className="admin-btn" disabled={busy} onClick={() => run()}>
            {busy ? <span className="admin-btn-spinner" /> : <Play size={14} />} Tampilkan
          </button>
        </div>

        {error && <p className="admin-error mb-3">⚠ {error}</p>}

        {res && (
          <div className="admin-panel rounded-2xl overflow-x-auto">
            <div className="px-4 pt-4 pb-2">
              <p className="text-[0.7rem] uppercase tracking-[0.15em] text-gray-400">{setting?.company_name ?? "TKA"}</p>
              <p className="font-semibold text-[#021d47]">{def.title}</p>
              <p className="text-xs text-gray-500">{res.subtitle}</p>
              {res.note && <p className="text-xs text-amber-700 mt-1">{res.note}</p>}
            </div>
            <table className="admin-table">
              <thead>
                <tr>{res.columns.map((c) => <th key={c.key} className={c.num ? "!text-right" : ""}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {res.rows.length === 0 ? (
                  <tr><td colSpan={res.columns.length} className="!text-center py-10 text-gray-400 italic">Tidak ada data pada periode ini.</td></tr>
                ) : (
                  res.rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={r._href ? () => router.push(r._href!) : undefined}
                      className={`${r._href ? "cursor-pointer" : ""} ${r._style === "total" ? "bg-slate-100 font-bold text-[#021d47]" : r._style === "bold" ? "font-semibold" : r._style === "head" ? "bg-slate-50" : ""}`}
                    >
                      {res.columns.map((c, ci) => {
                        const v = r[c.key];
                        return (
                          <td
                            key={c.key}
                            className={`${c.num ? "!text-right tabular-nums" : ""} ${r._style === "head" ? "!font-bold !text-[#021d47] uppercase text-xs tracking-wider" : ""}`}
                            style={ci === 1 && r._indent ? { paddingLeft: `${0.9 + r._indent * 1}rem` } : undefined}
                          >
                            {c.num ? (v === "" || v == null ? "" : fmtNum(Number(v), c.decimals ?? 2)) : String(v ?? "")}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[0.7rem] text-gray-400">{res.rows.filter((r) => !r._style).length.toLocaleString("id-ID")} baris</p>
          </div>
        )}
      </div>
    </TkaShell>
  );
}
