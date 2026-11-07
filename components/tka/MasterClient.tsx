"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Save, Trash2, X, Search } from "lucide-react";
import TkaShell from "./TkaShell";
import Picker from "./Picker";
import { MASTER_BY_KEY, type MasterField } from "@/lib/tka/masters";
import { db, errMsg, fetchAll, invalidateLookups } from "@/lib/tka/data";
import { useLookups } from "@/lib/tka/useLookups";
import { fmtDate, fmtNum } from "@/lib/tka/format";

type Row = Record<string, unknown>;
const PAGE = 100;

export default function MasterClient({ masterKey }: { masterKey: string }) {
  const cfg = MASTER_BY_KEY[masterKey];
  const needsAcc = cfg.fields.some((f) => f.type === "acc");
  const lk = useLookups(needsAcc ? ["acc"] : []);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [draft, setDraft] = useState<Row | null>(null);
  const [original, setOriginal] = useState<Row | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchAll<Row>((a, b) => {
      let qy = db().from(cfg.table).select("*");
      for (const o of cfg.order) qy = qy.order(o);
      return qy.range(a, b);
    })
      .then((r) => alive && setRows(r))
      .catch((e) => alive && setError(errMsg(e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cfg]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    const words = t.split(/\s+/);
    return rows.filter((r) => {
      const hay = cfg.fields.map((f) => String(r[f.key] ?? "")).join(" ").toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, q, cfg]);

  const listFields = cfg.fields.filter((f) => f.list);
  const keyOf = (r: Row) => cfg.pk.map((k) => String(r[k] ?? "")).join("|");

  function startNew() {
    const r: Row = {};
    for (const f of cfg.fields) r[f.key] = f.type === "number" ? 0 : f.type === "select" ? f.options?.[0]?.value ?? "" : f.type === "date" ? null : "";
    setDraft(r);
    setOriginal(null);
    setError("");
  }

  async function save() {
    if (!draft) return;
    for (const f of cfg.fields) if (f.required && !String(draft[f.key] ?? "").trim()) return setError(`${f.label} wajib diisi.`);
    setBusy(true);
    setError("");
    const payload: Row = {};
    for (const f of cfg.fields) {
      const v = draft[f.key];
      payload[f.key] =
        f.type === "number" || (f.type === "select" && f.key === "accgroup") ? Number(v ?? 0) || 0 : f.type === "date" ? (v || null) : String(v ?? "").trim();
    }
    try {
      let saved: Row;
      if (original) {
        let qy = db().from(cfg.table).update(payload);
        for (const k of cfg.pk) qy = qy.eq(k, original[k] as string);
        const { data, error } = await qy.select().single();
        if (error) throw error;
        saved = data;
        setRows((prev) => prev.map((r) => (keyOf(r) === keyOf(original) ? saved : r)));
      } else {
        const { data, error } = await db().from(cfg.table).insert(payload).select().single();
        if (error) throw error;
        saved = data;
        setRows((prev) => [saved, ...prev]);
      }
      if (cfg.lookupKey) invalidateLookups(cfg.lookupKey);
      setDraft(null);
      setOriginal(null);
    } catch (e) {
      const m = errMsg(e);
      setError(m.includes("duplicate") ? "Kode sudah dipakai." : m);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!original || !confirm("Hapus data ini?")) return;
    setBusy(true);
    let qy = db().from(cfg.table).delete();
    for (const k of cfg.pk) qy = qy.eq(k, original[k] as string);
    const { error } = await qy;
    setBusy(false);
    if (error) return setError(error.message);
    setRows((prev) => prev.filter((r) => keyOf(r) !== keyOf(original)));
    if (cfg.lookupKey) invalidateLookups(cfg.lookupKey);
    setDraft(null);
    setOriginal(null);
  }

  const cell = (f: MasterField, r: Row) => {
    const v = r[f.key];
    if (f.type === "number") return <span className="tabular-nums">{fmtNum(Number(v))}</span>;
    if (f.type === "date") return fmtDate(String(v ?? ""));
    if (f.type === "select") return f.options?.find((o) => o.value === String(v))?.label ?? String(v ?? "");
    return String(v ?? "");
  };

  return (
    <TkaShell
      active={`master-${cfg.key}`}
      title={cfg.title}
      eyebrow="TKA · Master"
      actions={<button onClick={startNew} className="admin-btn"><Plus size={14} /> Tambah</button>}
    >
      {draft && (
        <div className="admin-panel rounded-2xl p-5 mb-4">
          <p className="admin-panel-heading mb-3">{original ? "Edit" : "Tambah"} {cfg.title}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cfg.fields.map((f) => (
              <div key={f.key} className={f.span === 2 ? "sm:col-span-2" : ""}>
                <label className="admin-label">{f.label}</label>
                {f.type === "acc" ? (
                  <Picker
                    items={lk.acc}
                    value={String(draft[f.key] ?? "")}
                    display={String(draft[f.key] ?? "")}
                    onPick={(it) => setDraft((d) => ({ ...d!, [f.key]: it?.value ?? "" }))}
                    placeholder="Cari akun…"
                  />
                ) : f.type === "select" ? (
                  <select className="admin-input" value={String(draft[f.key] ?? "")} onChange={(e) => setDraft((d) => ({ ...d!, [f.key]: e.target.value }))}>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                    step="any"
                    className={`admin-input ${f.type === "number" ? "text-right" : ""}`}
                    value={String(draft[f.key] ?? "")}
                    disabled={!!original && cfg.pk.includes(f.key) && cfg.key === "akun"}
                    onChange={(e) => setDraft((d) => ({ ...d!, [f.key]: e.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
          {error && <p className="admin-error mt-3">⚠ {error}</p>}
          <div className="flex gap-2 mt-4">
            <button onClick={save} disabled={busy} className="admin-btn">{busy ? <span className="admin-btn-spinner" /> : <Save size={14} />} Simpan</button>
            <button onClick={() => { setDraft(null); setOriginal(null); }} className="admin-btn-ghost"><X size={14} /> Batal</button>
            {original && <button onClick={remove} disabled={busy} className="admin-btn-ghost !text-red-600 ml-auto"><Trash2 size={14} /> Hapus</button>}
          </div>
        </div>
      )}

      <div className="admin-panel rounded-2xl p-3 mb-3 flex items-center gap-2">
        <Search size={15} className="text-gray-400 ml-1" />
        <input className="admin-input" value={q} onChange={(e) => { setQ(e.target.value); setShown(PAGE); }} placeholder="Cari kode atau nama…" />
        <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length.toLocaleString("id-ID")} data</span>
      </div>
      {!draft && error && <p className="admin-error mb-3">⚠ {error}</p>}

      <div className="admin-panel rounded-2xl overflow-x-auto">
        <table className="admin-table">
          <thead>
            <tr>{listFields.map((f) => <th key={f.key} className={f.type === "number" ? "!text-right" : ""}>{f.label}</th>)}</tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={listFields.length} className="!text-center py-10 text-gray-400">Memuat…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={listFields.length} className="!text-center py-10 text-gray-400 italic">Tidak ada data.</td></tr>
            ) : (
              filtered.slice(0, shown).map((r) => (
                <tr
                  key={keyOf(r)}
                  className="cursor-pointer"
                  onClick={() => { setDraft({ ...r }); setOriginal(r); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                >
                  {listFields.map((f, i) => (
                    <td key={f.key} className={`${f.type === "number" ? "!text-right" : ""} ${i === 0 ? "font-mono text-[0.8rem] text-[#021d47]" : ""}`}>
                      {cell(f, r)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {filtered.length > shown && (
        <div className="text-center mt-3">
          <button className="admin-btn-ghost" onClick={() => setShown((s) => s + PAGE * 3)}>Tampilkan lebih banyak</button>
        </div>
      )}
    </TkaShell>
  );
}
