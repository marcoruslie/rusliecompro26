"use client";

import { Fragment, useEffect, useState } from "react";
import { Check, X, RotateCcw } from "lucide-react";
import TkaShell from "./TkaShell";
import Picker from "./Picker";
import { db, errMsg, fetchAll } from "@/lib/tka/data";
import { useLookups } from "@/lib/tka/useLookups";
import { fmtDate, fmtNum, todayISO } from "@/lib/tka/format";

type Giro = {
  id: number; status: string; nomor: string; tanggal: string; sub: string; subname: string; bg: string; acc: string;
  acc1: string; bank: string; bgdue: string; bgval: number; bgrem: string; cairdate: string | null; cair: string;
};

const STATUS: Record<string, string> = { "": "Terbuka", C: "Cair", T: "Tolak" };

export default function GiroClient() {
  const lk = useLookups(["acc"]);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [rows, setRows] = useState<Giro[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const [tgl, setTgl] = useState(todayISO());
  const [acc1, setAcc1] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetchAll<Giro>((a, b) => {
        let q = db().from("tka_giro").select("*");
        if (filter === "open") q = q.eq("cair", "");
        else q = q.gte("bgdue", `${new Date().getFullYear() - 1}-01-01`);
        return q.order("bgdue", { ascending: filter === "open" }).range(a, b);
      });
      setRows(r);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(g: Giro, cair: string) {
    if (cair === "C" && !(acc1 || g.acc1)) return setError("Pilih akun bank pencairan.");
    setBusy(true);
    setError("");
    const { error } = await db().rpc("tka_giro_status", { p_id: g.id, p_cair: cair, p_tanggal: tgl, p_acc1: acc1 || g.acc1 });
    setBusy(false);
    if (error) return setError(error.message);
    setEditing(null);
    load();
  }

  const totalOpen = rows.filter((r) => r.cair === "").reduce((s, r) => s + Number(r.bgval), 0);

  return (
    <TkaShell
      active="giro"
      title="Pencairan / Tolak Cek & Giro"
      eyebrow="TKA · Kas / Bank"
      actions={
        <select className="admin-input w-44" value={filter} onChange={(e) => setFilter(e.target.value as "open" | "all")}>
          <option value="open">Belum cair</option>
          <option value="all">Semua (2 tahun terakhir)</option>
        </select>
      }
    >
      {error && <p className="admin-error mb-3">⚠ {error}</p>}
      <p className="text-sm text-gray-500 mb-3">
        Giro terbuka: <b className="text-[#021d47]">{fmtNum(totalOpen)}</b>. Mencairkan giro memposting jurnal RGR (bank / piutang giro), menolak memindahkan kembali ke piutang/hutang.
      </p>
      <div className="admin-panel rounded-2xl overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Jenis</th>
              <th>No. Cek/Giro</th>
              <th>Bank</th>
              <th>Jatuh Tempo</th>
              <th>Dari / Kepada</th>
              <th>Bukti</th>
              <th className="!text-right">Nilai</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="!text-center py-10 text-gray-400">Memuat…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} className="!text-center py-10 text-gray-400 italic">Tidak ada giro.</td></tr>
            ) : (
              rows.map((g) => (
                <Fragment key={g.id}>
                  <tr>
                    <td>{g.status === "1" ? "Keluar" : "Masuk"}</td>
                    <td className="font-mono text-xs">{g.bg}</td>
                    <td>{g.bank}</td>
                    <td className={g.cair === "" && g.bgdue && g.bgdue <= todayISO() ? "text-red-600 font-semibold" : ""}>{fmtDate(g.bgdue)}</td>
                    <td>{g.subname}</td>
                    <td className="text-xs">{g.nomor}</td>
                    <td className="!text-right tabular-nums">{fmtNum(g.bgval)}</td>
                    <td>{STATUS[g.cair] ?? g.cair}{g.cairdate ? ` ${fmtDate(g.cairdate)}` : ""}</td>
                    <td>
                      {g.cair === "" ? (
                        <button className="admin-btn-ghost !py-1" onClick={() => { setEditing(editing === g.id ? null : g.id); setAcc1(g.acc1); }}>Proses</button>
                      ) : (
                        <button className="admin-btn-ghost !py-1" disabled={busy} onClick={() => setStatus(g, "")} title="Batalkan pencairan / tolak">
                          <RotateCcw size={13} /> Buka
                        </button>
                      )}
                    </td>
                  </tr>
                  {editing === g.id && (
                    <tr className="bg-slate-50">
                      <td colSpan={9}>
                        <div className="flex flex-wrap items-end gap-2">
                          <div>
                            <label className="admin-label">Tanggal</label>
                            <input type="date" className="admin-input" value={tgl} onChange={(e) => setTgl(e.target.value)} />
                          </div>
                          <div className="w-80">
                            <label className="admin-label">Akun bank pencairan</label>
                            <Picker items={lk.acc} value={acc1} onPick={(i) => setAcc1(i?.value ?? "")} placeholder="Pilih bank" />
                          </div>
                          <button className="admin-btn" disabled={busy} onClick={() => setStatus(g, "C")}><Check size={14} /> Cair</button>
                          <button className="admin-btn-ghost !text-red-600" disabled={busy} onClick={() => setStatus(g, "T")}><X size={14} /> Tolak</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </TkaShell>
  );
}
