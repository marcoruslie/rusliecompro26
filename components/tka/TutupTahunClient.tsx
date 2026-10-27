"use client";

import { useEffect, useState } from "react";
import { Eye, Lock } from "lucide-react";
import TkaShell from "./TkaShell";
import { errMsg, lookups, rpcAll } from "@/lib/tka/data";
import { fmtNum } from "@/lib/tka/format";

type Row = { jenis: string; kunci: string; nilai: number; nilai_ada: number };

export default function TutupTahunClient() {
  const [years, setYears] = useState<number[]>([]);
  const [tahun, setTahun] = useState(new Date().getFullYear() - 1);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    lookups.tahun().then(setYears).catch((e) => setError(errMsg(e)));
  }, []);

  async function run(simpan: boolean) {
    if (simpan && !confirm(`Tulis saldo awal ${tahun + 1} dari hasil tutup buku ${tahun}? Saldo awal ${tahun + 1} yang ada akan diganti.`)) return;
    setBusy(true);
    setError("");
    setMsg("");
    try {
      const r = await rpcAll<Row>("tka_tutup_tahun", { p_tahun: tahun, p_simpan: simpan });
      setRows(r);
      if (simpan) setMsg(`Saldo awal akun & persediaan ${tahun + 1} sudah ditulis.`);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const diff = (rows ?? []).filter((r) => Math.abs(Number(r.nilai) - Number(r.nilai_ada)) >= 1);
  const hasExisting = (rows ?? []).some((r) => Number(r.nilai_ada) !== 0);

  return (
    <TkaShell active="tutup-tahun" title="Tutup Tahun" eyebrow="TKA · Utilitas">
      <div className="admin-panel rounded-2xl p-5 mb-4">
        <p className="text-sm text-gray-600 mb-4 max-w-3xl">
          Menghitung saldo awal tahun berikutnya: akun neraca dibawa ke tahun baru, akun rugi/laba ditutup ke Laba Ditahan
          (lihat Pengaturan Akun), dan stok akhir menjadi stok awal. Jalankan &ldquo;Periksa&rdquo; dulu untuk melihat
          perbedaan dengan saldo awal yang sudah ada. Data tahun lama dari program DOS sudah membawa saldo awalnya sendiri.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="admin-label">Tutup buku tahun</label>
            <select className="admin-input w-28" value={tahun} onChange={(e) => { setTahun(Number(e.target.value)); setRows(null); }}>
              {(years.length ? years : [tahun]).map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button className="admin-btn-ghost" disabled={busy} onClick={() => run(false)}><Eye size={14} /> Periksa</button>
          <button className="admin-btn" disabled={busy || !rows} onClick={() => run(true)}><Lock size={14} /> Tulis Saldo Awal {tahun + 1}</button>
        </div>
      </div>

      {error && <p className="admin-error mb-3">⚠ {error}</p>}
      {msg && <p className="mb-3 text-sm text-emerald-700">✓ {msg}</p>}

      {rows && (
        <div className="admin-panel rounded-2xl overflow-x-auto">
          <div className="px-4 pt-4 pb-2 text-sm">
            {!hasExisting ? (
              <p>Belum ada saldo awal {tahun + 1}. {rows.length} baris akan ditulis.</p>
            ) : diff.length === 0 ? (
              <p className="text-emerald-700">Hasil perhitungan sama dengan saldo awal {tahun + 1} yang sudah ada.</p>
            ) : (
              <p className="text-amber-700">{diff.length} baris berbeda dengan saldo awal {tahun + 1} yang sudah ada:</p>
            )}
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Akun / Barang</th>
                <th className="!text-right">Hasil Hitung</th>
                <th className="!text-right">Saldo Awal Tersimpan</th>
                <th className="!text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {(hasExisting ? diff : rows).slice(0, 500).map((r, i) => (
                <tr key={i}>
                  <td>{r.jenis}</td>
                  <td className="font-mono text-xs">{r.kunci}</td>
                  <td className="!text-right tabular-nums">{fmtNum(r.nilai)}</td>
                  <td className="!text-right tabular-nums">{fmtNum(r.nilai_ada)}</td>
                  <td className="!text-right tabular-nums">{fmtNum(Number(r.nilai) - Number(r.nilai_ada))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </TkaShell>
  );
}
