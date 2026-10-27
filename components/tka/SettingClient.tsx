"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import TkaShell from "./TkaShell";
import Picker from "./Picker";
import { db, errMsg, lookups, type Setting } from "@/lib/tka/data";
import { useLookups } from "@/lib/tka/useLookups";

// Legacy TACC.DBF: the accounts the posting engine (tka_post) uses.
const ACC_FIELDS: { key: string; label: string }[] = [
  { key: "acckas", label: "Kas" },
  { key: "accgiro", label: "Piutang Giro Mundur" },
  { key: "acchgiro", label: "Hutang Giro" },
  { key: "accpiut", label: "Piutang Usaha (default)" },
  { key: "acchut", label: "Hutang Usaha (default)" },
  { key: "accinvbb", label: "Persediaan Bahan Baku" },
  { key: "accinvbj", label: "Persediaan Barang Jadi" },
  { key: "accjlhp", label: "Penjualan Partai" },
  { key: "accjlhe", label: "Penjualan Eceran" },
  { key: "accjlht", label: "Penjualan Toko" },
  { key: "accrjl", label: "Retur Penjualan" },
  { key: "acchppp", label: "HPP Partai" },
  { key: "acchppe", label: "HPP Eceran" },
  { key: "acchppt", label: "HPP Toko" },
  { key: "accdisc", label: "Diskon Penjualan" },
  { key: "accdiss", label: "Diskon Pembelian" },
  { key: "accppnjlh", label: "PPN Keluaran" },
  { key: "accppnbli", label: "PPN Masukan" },
  { key: "acclslaba", label: "Laba Ditahan" },
  { key: "accnxlaba", label: "Laba Tahun Berjalan" },
  { key: "accuh", label: "Biaya Harian Produksi" },
  { key: "accum", label: "Uang Makan" },
  { key: "accul", label: "Uang Lembur" },
  { key: "accux", label: "Uang Extra" },
];

export default function SettingClient() {
  const lk = useLookups(["acc"]);
  const [s, setS] = useState<Setting | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    lookups.setting().then(setS).catch((e) => setError(errMsg(e)));
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    setError("");
    setMsg("");
    const { id: _id, ...rest } = s as Setting & { id?: number };
    void _id;
    const { error } = await db().from("tka_setting").update(rest).eq("id", 1);
    setBusy(false);
    if (error) setError(error.message);
    else setMsg("Pengaturan tersimpan.");
  }

  return (
    <TkaShell
      active="pengaturan"
      title="Pengaturan Akun"
      eyebrow="TKA · Utilitas"
      actions={<button onClick={save} disabled={busy || !s} className="admin-btn"><Save size={14} /> Simpan</button>}
    >
      {error && <p className="admin-error mb-3">⚠ {error}</p>}
      {msg && <p className="mb-3 text-sm text-emerald-700">✓ {msg}</p>}
      {!s ? (
        <div className="admin-panel rounded-2xl p-10 text-center text-gray-400">Memuat…</div>
      ) : (
        <>
          <div className="admin-panel rounded-2xl p-5 mb-4 grid sm:grid-cols-2 gap-3">
            <div>
              <label className="admin-label">Nama Perusahaan (kop cetakan)</label>
              <input className="admin-input" value={s.company_name} onChange={(e) => setS({ ...s, company_name: e.target.value })} />
            </div>
            <div>
              <label className="admin-label">Alamat / Kota</label>
              <input className="admin-input" value={s.company_address} onChange={(e) => setS({ ...s, company_address: e.target.value })} />
            </div>
          </div>
          <div className="admin-panel rounded-2xl p-5">
            <p className="admin-panel-heading mb-1">Akun Posting Otomatis</p>
            <p className="text-xs text-gray-500 mb-4">Dipakai saat nota, faktur, hasil produksi dan tutup tahun diposting ke jurnal.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ACC_FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="admin-label">{f.label}</label>
                  <Picker
                    items={lk.acc}
                    value={s[f.key] ?? ""}
                    onPick={(it) => setS({ ...s, [f.key]: it?.value ?? "" })}
                    placeholder="—"
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </TkaShell>
  );
}
