"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, Printer, ArrowLeft, Scale, Download, BookOpen } from "lucide-react";
import TkaShell from "./TkaShell";
import Picker, { type PickItem } from "./Picker";
import { DOC_BY_JNL, emptyLine, getPath, setPath, type DocConfig, type LineCol } from "@/lib/tka/docs";
import { db, errMsg, fetchAll, type Doc, type DocLine } from "@/lib/tka/data";
import { useLookups, invKey, type LookupKind, type Lookups } from "@/lib/tka/useLookups";
import { fmtDate, fmtNum, round2, todayISO } from "@/lib/tka/format";

type Header = Pick<Doc, "nomor" | "tanggal" | "sub" | "subname" | "rem"> & { h: Record<string, unknown> };

const n = (v: unknown) => Number(v ?? 0) || 0;

function kindsFor(cfg: DocConfig): LookupKind[] {
  const k = new Set<LookupKind>();
  if (cfg.sub) k.add(cfg.sub);
  for (const c of cfg.cols) {
    if (c.type === "inv") k.add("inv");
    if (c.type === "acc") k.add("acc");
    if (c.type === "pekerja") k.add("pekerja");
  }
  if (cfg.balanced) k.add("acc");
  return Array.from(k);
}

export default function DocFormClient({ jnl, id }: { jnl: string; id: string }) {
  const cfg = DOC_BY_JNL[jnl];
  const router = useRouter();
  const isNew = id === "baru";
  const lk = useLookups(kindsFor(cfg));
  const [head, setHead] = useState<Header>({ nomor: "", tanggal: todayISO(), sub: "", subname: "", rem: "", h: { loc: "01" } });
  const [lines, setLines] = useState<DocLine[]>(() => [emptyLine(cfg)]);
  const [meta, setMeta] = useState<{ legacy: boolean; chuser: string } | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [balanceAcc, setBalanceAcc] = useState("");

  useEffect(() => {
    if (isNew) return;
    let alive = true;
    (async () => {
      try {
        const { data: d, error: e1 } = await db().from("tka_doc").select("*").eq("id", Number(id)).single();
        if (e1) throw e1;
        const ls = await fetchAll<DocLine>((a, b) =>
          db().from("tka_doc_line").select("*").eq("doc_id", Number(id)).order("urut").order("id").range(a, b)
        );
        if (!alive) return;
        const doc = d as Doc;
        setHead({ nomor: doc.nomor, tanggal: doc.tanggal, sub: doc.sub, subname: doc.subname, rem: doc.rem, h: doc.h ?? {} });
        setLines(ls.length ? ls.map((l) => ({ ...l, qty: n(l.qty), price: n(l.price), val: n(l.val), d: l.d ?? {} })) : [emptyLine(cfg)]);
        setMeta({ legacy: doc.legacy, chuser: doc.chuser });
      } catch (e) {
        if (alive) setError(errMsg(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, isNew, cfg]);

  // Remember the cash/bank account used to balance vouchers, per voucher type.
  useEffect(() => {
    if (!cfg.balanced) return;
    try {
      const v = localStorage.getItem(`tka-balance-${jnl}`);
      if (v) setBalanceAcc(v);
    } catch {}
  }, [cfg.balanced, jnl]);

  const filled = useMemo(
    () => lines.filter((l) => l.inv || l.acc || l.invname || n(l.val) || n(l.qty)),
    [lines]
  );
  const totals = useMemo(() => cfg.calcTotal(head.h, filled), [cfg, head.h, filled]);
  const debet = round2(filled.reduce((s, l) => s + (l.dk === "D" ? n(l.val) : 0), 0));
  const kredit = round2(filled.reduce((s, l) => s + (l.dk === "K" ? n(l.val) : 0), 0));

  function updateLine(i: number, patch: (l: DocLine) => DocLine) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? (cfg.calcLine ? cfg.calcLine(patch(l)) : patch(l)) : l)));
  }

  function pickInv(i: number, item: PickItem | null) {
    const inv = item ? lk.invMap.get(item.value) : null;
    updateLine(i, (l) => {
      const d = { ...l.d };
      delete d.hpp;
      delete d.hpp_val;
      delete d.hpp_qty;
      if (!inv) return { ...l, gol: "", inv: "", invname: "", d };
      const next: DocLine = { ...l, gol: inv.gol, inv: inv.inv, invname: inv.name, unit: inv.unit || l.unit, d };
      if (cfg.ctx.priceField) next.price = n(inv[cfg.ctx.priceField]) || l.price;
      if (jnl === "BHP") next.d = { ...d, ongkos: inv.ongkos, ongkos1: inv.ongkos1 };
      if (jnl === "BBK" && inv.dmeter) next.d = { ...d, dmeter: inv.dmeter };
      if (jnl === "POP" || jnl === "JLH") next.d = { ...next.d, nogudang: inv.nogudang || undefined };
      return next;
    });
  }

  function pickSub(item: PickItem | null) {
    setHead((h) => ({ ...h, sub: item?.value ?? "", subname: item?.label ?? "" }));
  }

  function addBalancingLine() {
    const diff = round2(debet - kredit);
    if (!diff) return;
    if (!balanceAcc) {
      setError("Pilih akun kas/bank untuk penyeimbang.");
      return;
    }
    try {
      localStorage.setItem(`tka-balance-${jnl}`, balanceAcc);
    } catch {}
    const acc = lk.accMap.get(balanceAcc);
    setLines((prev) => [
      ...prev.filter((l) => l.acc || l.val),
      { ...emptyLine(cfg), acc: balanceAcc, rem: acc?.name ?? "", dk: diff > 0 ? "K" : "D", val: Math.abs(diff) },
    ]);
  }

  async function save() {
    setError("");
    setNotice("");
    if (!head.tanggal) return setError("Tanggal wajib diisi.");
    if (cfg.subRequired && !head.sub) return setError(`${cfg.subLabel} wajib diisi.`);
    if (!filled.length) return setError("Isi minimal satu baris.");
    if (cfg.balanced && debet !== kredit) return setError(`Jurnal belum seimbang: debet ${fmtNum(debet)} ≠ kredit ${fmtNum(kredit)}.`);
    if (cfg.balanced && filled.some((l) => !l.acc)) return setError("Setiap baris wajib memakai akun.");
    setSaving(true);
    try {
      const payload = {
        id: isNew ? null : Number(id),
        jnl,
        nomor: head.nomor,
        tanggal: head.tanggal,
        sub: head.sub,
        subname: head.subname || String(head.h.subname ?? ""),
        total: totals.total,
        rem: head.rem,
        h: totals.h,
        lines: filled.map((l) => ({ ...l, id: undefined, doc_id: undefined, urut: undefined })),
      };
      const { data, error } = await db().rpc("tka_save_doc", { p: payload });
      if (error) throw error;
      setNotice("Tersimpan dan sudah diposting.");
      if (isNew) router.replace(`/admin/tka/dok/${jnl}/${data}`);
      else {
        const { data: d } = await db().from("tka_doc").select("nomor,chuser,legacy").eq("id", Number(id)).single();
        if (d) {
          setHead((h) => ({ ...h, nomor: d.nomor }));
          setMeta({ legacy: d.legacy, chuser: d.chuser });
        }
      }
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirm(`Hapus ${cfg.short} ${head.nomor}? Jurnal & mutasi stoknya ikut terhapus.`)) return;
    setSaving(true);
    const { error } = await db().rpc("tka_delete_doc", { p_id: Number(id) });
    setSaving(false);
    if (error) return setError(error.message);
    router.replace(`/admin/tka/dok/${jnl}`);
  }

  if (!cfg) return null;

  return (
    <TkaShell
      active={`dok-${jnl}`}
      title={isNew ? `${cfg.short} Baru` : `${cfg.short} ${head.nomor}`}
      eyebrow={`TKA · ${cfg.title}`}
      wide
      actions={
        <>
          <Link href={`/admin/tka/dok/${jnl}`} className="admin-btn-ghost">
            <ArrowLeft size={14} /> Daftar
          </Link>
          {!isNew && (
            <>
              <Link href={`/admin/tka/dok/${jnl}/${id}/cetak`} className="admin-btn-ghost" target="_blank">
                <Printer size={14} /> Cetak
              </Link>
              {cfg.extraPrints?.map((p) => (
                <Link key={p.key} href={`/admin/tka/dok/${jnl}/${id}/cetak?v=${p.key}`} className="admin-btn-ghost" target="_blank">
                  <Printer size={14} /> {p.label}
                </Link>
              ))}
              <button onClick={remove} disabled={saving} className="admin-btn-ghost !text-red-600">
                <Trash2 size={14} /> Hapus
              </button>
            </>
          )}
          <button onClick={save} disabled={saving || loading} className="admin-btn">
            {saving ? <span className="admin-btn-spinner" /> : <Save size={14} />} Simpan
          </button>
        </>
      }
    >
      {(error || lk.error) && <p className="admin-error mb-3">⚠ {error || lk.error}</p>}
      {notice && <p className="mb-3 text-sm text-emerald-700">✓ {notice}</p>}
      {meta?.legacy && (
        <p className="mb-3 text-xs text-gray-500">
          Diimpor dari program lama{meta.chuser ? ` · terakhir diubah ${meta.chuser}` : ""}. Menyimpan ulang akan memposting ulang jurnal & stok dokumen ini.
        </p>
      )}

      {loading ? (
        <div className="admin-panel rounded-2xl p-10 text-center text-gray-400">Memuat…</div>
      ) : (
        <>
          <div className="admin-panel rounded-2xl p-5 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {cfg.header.map((f) => (
                <div key={f.path} className={f.span === 2 ? "sm:col-span-2" : f.span === 3 ? "sm:col-span-2 lg:col-span-3" : ""}>
                  <label className="admin-label">{f.label}</label>
                  <HeaderInput f={f} head={head} setHead={setHead} lk={lk} cfg={cfg} pickSub={pickSub} />
                </div>
              ))}
            </div>
            <Helpers jnl={jnl} head={head} setHead={setHead} setLines={setLines} cfg={cfg} lk={lk} setError={setError} />
          </div>

          <div className="admin-panel rounded-2xl overflow-x-auto mb-4">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-8">#</th>
                  {cfg.cols.map((c) => (
                    <th key={c.path} className={c.type === "number" ? "!text-right" : ""}>{c.label}</th>
                  ))}
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i}>
                    <td className="text-gray-400 text-xs">{i + 1}</td>
                    {cfg.cols.map((c) => (
                      <td key={c.path} className={`!px-1.5 !py-1 ${c.width ?? ""}`}>
                        <LineInput c={c} l={l} i={i} lk={lk} updateLine={updateLine} pickInv={pickInv} />
                      </td>
                    ))}
                    <td className="!px-1">
                      <button
                        onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : [emptyLine(cfg)]))}
                        className="text-red-400 hover:text-red-600"
                        title="Hapus baris"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-t border-slate-100">
              <button onClick={() => setLines((p) => [...p, emptyLine(cfg)])} className="admin-btn-ghost">
                <Plus size={14} /> Tambah Baris
              </button>
              <div className="flex flex-wrap items-center gap-5 text-sm">
                {cfg.balanced ? (
                  <>
                    <span>Debet <b className="tabular-nums">{fmtNum(debet)}</b></span>
                    <span>Kredit <b className="tabular-nums">{fmtNum(kredit)}</b></span>
                    <span className={debet === kredit ? "text-emerald-700" : "text-red-600"}>
                      Selisih <b className="tabular-nums">{fmtNum(debet - kredit)}</b>
                    </span>
                  </>
                ) : (
                  <Totals jnl={jnl} totals={totals} />
                )}
              </div>
            </div>
            {cfg.balanced && debet !== kredit && (
              <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
                <span className="text-xs text-gray-500">Seimbangkan dengan akun kas/bank:</span>
                <div className="w-72">
                  <Picker items={lk.acc} value={balanceAcc} onPick={(it) => setBalanceAcc(it?.value ?? "")} placeholder="Pilih akun kas / bank" />
                </div>
                <button onClick={addBalancingLine} className="admin-btn-ghost"><Scale size={14} /> Seimbangkan</button>
              </div>
            )}
          </div>

          {!isNew && <Postings docId={Number(id)} lk={lk} />}
        </>
      )}
    </TkaShell>
  );
}

function Totals({ jnl, totals }: { jnl: string; totals: { total: number; h: Record<string, unknown> } }) {
  if (jnl === "JLH" || jnl === "BLI") {
    return (
      <>
        <span>Bruto <b className="tabular-nums">{fmtNum(n(totals.h.bruto))}</b></span>
        {n(totals.h.discval) !== 0 && <span>Diskon <b className="tabular-nums">{fmtNum(n(totals.h.discval))}</b></span>}
        {n(totals.h.ppnval) !== 0 && <span>PPN <b className="tabular-nums">{fmtNum(n(totals.h.ppnval))}</b></span>}
        <span className="text-base">Netto <b className="tabular-nums text-[#021d47]">{fmtNum(totals.total)}</b></span>
      </>
    );
  }
  if (jnl === "BPB" || jnl === "BBK") return null;
  return <span className="text-base">Total <b className="tabular-nums text-[#021d47]">{fmtNum(totals.total)}</b></span>;
}

function HeaderInput({
  f, head, setHead, lk, cfg, pickSub,
}: {
  f: DocConfig["header"][number];
  head: Header;
  setHead: React.Dispatch<React.SetStateAction<Header>>;
  lk: Lookups;
  cfg: DocConfig;
  pickSub: (i: PickItem | null) => void;
}) {
  const raw = f.path.startsWith("h.") ? head.h[f.path.slice(2)] : (head as unknown as Record<string, unknown>)[f.path];
  const set = (v: unknown) => setHead((h) => setPath(h as unknown as Record<string, unknown>, f.path, v) as unknown as Header);

  if (f.type === "sub" && cfg.sub) {
    const items = cfg.sub === "cus" ? lk.cus : cfg.sub === "sup" ? lk.sup : lk.pekerja;
    return (
      <Picker
        items={items}
        value={head.sub}
        display={head.sub ? `${head.sub} — ${head.subname}` : ""}
        onPick={pickSub}
        placeholder={`Cari ${cfg.subLabel?.toLowerCase()}…`}
      />
    );
  }
  if (f.type === "date") return <input type="date" className="admin-input" value={String(raw ?? "").slice(0, 10)} onChange={(e) => set(e.target.value || undefined)} />;
  if (f.type === "number") return <input type="number" step="any" className="admin-input text-right" value={raw == null || raw === 0 ? "" : String(raw)} onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))} />;
  if (f.type === "select")
    return (
      <select className="admin-input" value={String(raw ?? f.options?.[0]?.value ?? "")} onChange={(e) => set(e.target.value)}>
        {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  return <input className="admin-input" value={String(raw ?? "")} placeholder={f.placeholder} onChange={(e) => set(e.target.value)} />;
}

function LineInput({
  c, l, i, lk, updateLine, pickInv,
}: {
  c: LineCol;
  l: DocLine;
  i: number;
  lk: Lookups;
  updateLine: (i: number, p: (l: DocLine) => DocLine) => void;
  pickInv: (i: number, item: PickItem | null) => void;
}) {
  const raw = getPath(l as unknown as Record<string, unknown>, c.path);
  const set = (v: unknown) => updateLine(i, (x) => setPath(x as unknown as Record<string, unknown>, c.path, v) as unknown as DocLine);
  const cls = "!py-1.5 !text-[0.8rem]";

  if (c.type === "inv") {
    return (
      <div className="space-y-1">
        <Picker
          items={lk.inv}
          value={l.inv ? invKey(l.gol, l.inv) : ""}
          display={l.inv ? `${l.inv}` : ""}
          onPick={(it) => pickInv(i, it)}
          placeholder="Kode / nama barang"
          className={cls}
        />
        <input className={`admin-input ${cls}`} value={l.invname} placeholder="Nama barang" onChange={(e) => updateLine(i, (x) => ({ ...x, invname: e.target.value }))} />
      </div>
    );
  }
  if (c.type === "acc") {
    return (
      <Picker
        items={lk.acc}
        value={l.acc}
        display={l.acc}
        onPick={(it) => updateLine(i, (x) => ({ ...x, acc: it?.value ?? "", rem: x.rem || it?.label || "" }))}
        placeholder="Akun"
        className={cls}
      />
    );
  }
  if (c.type === "pekerja") {
    return (
      <Picker
        items={lk.pekerja}
        value={l.tka}
        display={l.tka ? `${l.tka} ${String(l.d.tkaname ?? lk.pekerjaMap.get(l.tka)?.name ?? "")}` : ""}
        onPick={(it) =>
          updateLine(i, (x) => {
            const p = it ? lk.pekerjaMap.get(it.value) : null;
            return { ...x, tka: it?.value ?? "", d: { ...x.d, tkaname: p?.name ?? "" }, acc: x.acc || p?.acc_biaya || "" };
          })
        }
        placeholder="Pekerja"
        className={cls}
      />
    );
  }
  if (c.type === "select") {
    return (
      <select className={`admin-input ${cls}`} value={String(raw ?? "")} onChange={(e) => set(e.target.value)}>
        {c.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  }
  if (c.type === "date") return <input type="date" className={`admin-input ${cls}`} value={String(raw ?? "").slice(0, 10)} onChange={(e) => set(e.target.value || undefined)} />;
  if (c.type === "number") {
    if (c.readOnly) return <div className="text-right tabular-nums px-2 text-[0.8rem] text-gray-700">{fmtNum(n(raw))}</div>;
    return (
      <input
        type="number"
        step="any"
        className={`admin-input text-right tabular-nums ${cls}`}
        value={raw == null || raw === "" || raw === 0 ? "" : String(raw)}
        onChange={(e) => set(e.target.value === "" ? (c.path.startsWith("d.") ? undefined : 0) : Number(e.target.value))}
      />
    );
  }
  return <input className={`admin-input ${cls}`} value={String(raw ?? "")} onChange={(e) => set(e.target.value)} />;
}

/** Shortcuts that existed in the DOS program (F5 lookups). */
function Helpers({
  jnl, head, setHead, setLines, cfg, lk, setError,
}: {
  jnl: string;
  head: Header;
  setHead: React.Dispatch<React.SetStateAction<Header>>;
  setLines: React.Dispatch<React.SetStateAction<DocLine[]>>;
  cfg: DocConfig;
  lk: Lookups;
  setError: (s: string) => void;
}) {
  const [orderNo, setOrderNo] = useState("");
  const [orderYear, setOrderYear] = useState(String(new Date().getFullYear()));
  const [from, setFrom] = useState(todayISO());
  const [to, setTo] = useState(todayISO());
  const [busy, setBusy] = useState(false);

  async function ambilOrder() {
    setBusy(true);
    setError("");
    try {
      const { data: orders, error } = await db()
        .from("tka_doc").select("id,jnl,nomor,sub,subname,h").in("jnl", ["POP", "POE"])
        .eq("tahun", Number(orderYear)).eq("nomor", orderNo.trim());
      if (error) throw error;
      if (!orders?.length) throw new Error(`Order ${orderNo} tahun ${orderYear} tidak ditemukan.`);
      const o = orders[0] as Doc;
      const ls = await fetchAll<DocLine>((a, b) => db().from("tka_doc_line").select("*").eq("doc_id", o.id).order("urut").range(a, b));
      if (!head.sub) setHead((h) => ({ ...h, sub: o.sub, subname: o.subname }));
      const added: DocLine[] = ls.map((l) => {
        const base = emptyLine(cfg);
        const line: DocLine = {
          ...base, gol: l.gol, inv: l.inv, invname: l.invname, qty: n(l.qty), unit: l.unit, price: n(l.price),
          jnlno: o.nomor,
          d: {
            noorder: String(o.h?.noorder ?? ""), tk: o.jnl === "POE" ? "E" : "", nogudang: l.d?.nogudang,
            ukuran: l.d?.ukuran, golb: l.d?.golb, invb: l.d?.invb, berat: l.d?.berat, jnldate: undefined,
          },
        };
        return cfg.calcLine ? cfg.calcLine(line) : line;
      });
      setLines((prev) => [...prev.filter((l) => l.inv || l.invname || n(l.val)), ...added]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function ambilUpah() {
    setBusy(true);
    setError("");
    try {
      type V = DocLine & { nomor: string; tanggal: string; sub: string; subname: string };
      const bhd = await fetchAll<V>((a, b) =>
        db().from("tka_v_lines").select("*")
          .eq("jnl", "BHP").gte("tanggal", from).lte("tanggal", to).order("tanggal").range(a, b)
      );
      const nomors = Array.from(new Set(bhd.map((r) => r.nomor)));
      const paid = new Set<string>();
      for (let i = 0; i < nomors.length; i += 200) {
        const { data } = await db().from("tka_v_lines").select("jnlno,tka").eq("jnl", "KK").in("jnlno", nomors.slice(i, i + 200));
        for (const r of data ?? []) paid.add(`${r.jnlno}|${r.tka}`);
      }
      const fresh = bhd.filter((r) => n(r.val) && !paid.has(`${r.nomor}|${r.tka || r.sub}`));
      if (!fresh.length) throw new Error("Tidak ada upah hasil produksi yang belum dibayar pada periode itu.");
      const added = fresh.map((r) => {
        const worker = r.tka || r.sub;
        const p = lk.pekerjaMap.get(worker);
        return {
          ...emptyLine(cfg),
          acc: p?.acc_biaya ?? "",
          rem: `${r.invname} ${fmtNum(n(r.qty), 1)} ${r.unit} x ${fmtNum(n(r.d?.ongkos))}`.slice(0, 70),
          dk: "D",
          val: n(r.val),
          tka: worker,
          jnlno: r.nomor,
          d: { tkaname: p?.name ?? r.subname, ongkos: r.d?.ongkos, ongkos1: r.d?.ongkos1 },
        } as DocLine;
      });
      setLines((prev) => [...prev.filter((l) => l.acc || n(l.val)), ...added]);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (jnl === "JLH") {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-2">
        <div>
          <label className="admin-label">Ambil dari order no.</label>
          <input className="admin-input w-32" value={orderNo} onChange={(e) => setOrderNo(e.target.value)} placeholder="1001" />
        </div>
        <div>
          <label className="admin-label">Tahun order</label>
          <input className="admin-input w-24" value={orderYear} onChange={(e) => setOrderYear(e.target.value)} />
        </div>
        <button onClick={ambilOrder} disabled={busy || !orderNo} className="admin-btn-ghost"><Download size={14} /> Ambil Order</button>
      </div>
    );
  }
  if (jnl === "KK" || jnl === "BK") {
    return (
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-end gap-2">
        <div>
          <label className="admin-label">Upah hasil produksi dari</label>
          <input type="date" className="admin-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="admin-label">s/d</label>
          <input type="date" className="admin-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button onClick={ambilUpah} disabled={busy} className="admin-btn-ghost"><Download size={14} /> Ambil Upah Produksi</button>
      </div>
    );
  }
  return null;
}

function Postings({ docId, lk }: { docId: number; lk: Lookups }) {
  const [open, setOpen] = useState(false);
  const [jur, setJur] = useState<{ acc: string; rem: string; debet: number; kredit: number }[]>([]);
  const [mut, setMut] = useState<{ gol: string; inv: string; qin: number; qout: number; vin: number; vout: number; tanggal: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    db().from("tka_jurnal").select("acc,rem,debet,kredit").eq("doc_id", docId).order("id").then(({ data }) => setJur(data ?? []));
    db().from("tka_mutasi").select("gol,inv,qin,qout,vin,vout,tanggal").eq("doc_id", docId).order("id").then(({ data }) => setMut(data ?? []));
  }, [open, docId]);

  return (
    <div className="admin-panel rounded-2xl p-4">
      <button onClick={() => setOpen((o) => !o)} className="admin-btn-ghost"><BookOpen size={14} /> {open ? "Tutup" : "Lihat"} Jurnal & Mutasi Stok</button>
      {open && (
        <div className="grid lg:grid-cols-2 gap-4 mt-4">
          <div className="overflow-x-auto">
            <p className="admin-panel-heading mb-2">Jurnal</p>
            <table className="admin-table">
              <thead><tr><th>Akun</th><th>Keterangan</th><th className="!text-right">Debet</th><th className="!text-right">Kredit</th></tr></thead>
              <tbody>
                {jur.length === 0 ? <tr><td colSpan={4} className="text-gray-400 italic">Tidak ada jurnal.</td></tr> : jur.map((j, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap"><span className="font-mono text-xs">{j.acc}</span> <span className="text-xs text-gray-500">{lk.accMap.get(j.acc)?.name}</span></td>
                    <td className="text-xs">{j.rem}</td>
                    <td className="!text-right tabular-nums">{fmtNum(j.debet)}</td>
                    <td className="!text-right tabular-nums">{fmtNum(j.kredit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="overflow-x-auto">
            <p className="admin-panel-heading mb-2">Mutasi Stok</p>
            <table className="admin-table">
              <thead><tr><th>Tgl</th><th>Barang</th><th className="!text-right">Masuk</th><th className="!text-right">Keluar</th><th className="!text-right">Nilai</th></tr></thead>
              <tbody>
                {mut.length === 0 ? <tr><td colSpan={5} className="text-gray-400 italic">Tidak ada mutasi stok.</td></tr> : mut.map((m, i) => (
                  <tr key={i}>
                    <td>{fmtDate(m.tanggal)}</td>
                    <td className="text-xs">{m.gol} / {m.inv}</td>
                    <td className="!text-right tabular-nums">{fmtNum(m.qin)}</td>
                    <td className="!text-right tabular-nums">{fmtNum(m.qout)}</td>
                    <td className="!text-right tabular-nums">{fmtNum(Number(m.vin) - Number(m.vout))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

