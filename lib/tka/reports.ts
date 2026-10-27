// Reports of the TKA module — the legacy "Laporan Per-Periode" menu.
import { db, fetchAll, lookups, rpcAll, type Acc } from "./data";
import { NAMA_BULAN, round2 } from "./format";

export type ParamKind = "tanggal" | "periode" | "per" | "tahun" | "acc" | "inv" | "cus" | "sup" | "jenisStok";
export type Params = {
  dari: string;
  sampai: string;
  per: string;
  tahun: number;
  bulanDari: number;
  bulanSampai: number;
  acc: string;
  gol: string;
  inv: string;
  cus: string;
  sup: string;
  jenisStok: "" | "F" | "R";
};

export type Column = { key: string; label: string; num?: boolean; decimals?: number; sum?: boolean };
export type ReportRow = Record<string, unknown> & { _style?: "bold" | "head" | "total"; _indent?: number; _href?: string };
export type ReportResult = { columns: Column[]; rows: ReportRow[]; subtitle: string; note?: string };

export type ReportDef = {
  key: string;
  title: string;
  group: string;
  params: ParamKind[];
  run: (p: Params) => Promise<ReportResult>;
};

const n = (v: unknown) => Number(v ?? 0) || 0;
const fmtD = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const rangeLabel = (p: Params) => `${fmtD(p.dari)} s/d ${fmtD(p.sampai)}`;
const periodLabel = (p: Params) =>
  p.bulanDari === p.bulanSampai
    ? `${NAMA_BULAN[p.bulanSampai - 1]} ${p.tahun}`
    : `${NAMA_BULAN[p.bulanDari - 1]} s/d ${NAMA_BULAN[p.bulanSampai - 1]} ${p.tahun}`;
const docHref = (jnl: string, id: unknown) => (id ? `/admin/tka/dok/${jnl}/${id}` : undefined);

type DocRow = { id: number; jnl: string; nomor: string; tanggal: string; sub: string; subname: string; total: number; rem: string; h: Record<string, unknown> };
type LineRow = { doc_id: number; jnl: string; nomor: string; tanggal: string; sub: string; subname: string; gol: string; inv: string; invname: string; qty: number; unit: string; price: number; val: number; dk: string; acc: string; nota: string; jnlno: string; tka: string; rem: string; d: Record<string, unknown>; h: Record<string, unknown> };

const docs = (jnls: string[], p: Params) =>
  fetchAll<DocRow>((a, b) =>
    db().from("tka_doc").select("id,jnl,nomor,tanggal,sub,subname,total,rem,h").in("jnl", jnls)
      .gte("tanggal", p.dari).lte("tanggal", p.sampai).order("tanggal").order("nomor").range(a, b)
  );

const lines = (jnls: string[], p: Params) =>
  fetchAll<LineRow>((a, b) =>
    db().from("tka_v_lines").select("doc_id,jnl,nomor,tanggal,sub,subname,gol,inv,invname,qty,unit,price,val,dk,acc,nota,jnlno,tka,rem,d,h")
      .in("jnl", jnls).gte("tanggal", p.dari).lte("tanggal", p.sampai)
      .order("tanggal").order("nomor").order("urut").range(a, b)
  );

function groupSum<T>(rows: T[], key: (r: T) => string, init: (r: T) => ReportRow, add: (acc: ReportRow, r: T) => void): ReportRow[] {
  const m = new Map<string, ReportRow>();
  for (const r of rows) {
    const k = key(r);
    if (!m.has(k)) m.set(k, init(r));
    add(m.get(k)!, r);
  }
  return Array.from(m.values());
}

function withTotal(columns: Column[], rows: ReportRow[], label = "TOTAL"): ReportRow[] {
  const sums = columns.filter((c) => c.sum);
  if (!sums.length || !rows.length) return rows;
  const t: ReportRow = { _style: "total" };
  t[columns[0].key] = label;
  for (const c of sums) t[c.key] = round2(rows.filter((r) => !r._style || r._style === "bold").reduce((s, r) => s + n(r[c.key]), 0));
  return [...rows, t];
}

// ── Account tree helpers for financial statements ──
async function accTree() {
  const accs = await lookups.acc();
  const byAcc = new Map(accs.map((a) => [a.acc, a]));
  return { accs, byAcc };
}

/** Roll detail values up to their parents and return rows in code order, indented by level. */
function rollup(values: Map<string, number>, accs: Acc[], byAcc: Map<string, Acc>, filter: (a: Acc) => boolean, sign = 1): ReportRow[] {
  const total = new Map<string, number>();
  values.forEach((v, acc) => {
    let cur: string | undefined = acc;
    const seen = new Set<string>();
    while (cur && !seen.has(cur)) {
      seen.add(cur);
      total.set(cur, (total.get(cur) ?? 0) + v);
      cur = byAcc.get(cur)?.accinduk || undefined;
    }
  });
  const known = new Set(accs.map((a) => a.acc));
  const orphan = Array.from(values.keys()).filter((k) => !known.has(k));
  return [
    ...accs
      .filter((a) => filter(a) && Math.abs(total.get(a.acc) ?? 0) >= 0.005)
      .map((a) => ({
        acc: a.acc,
        name: a.name,
        nilai: round2((total.get(a.acc) ?? 0) * sign),
        _style: a.detil === "I" ? ("bold" as const) : undefined,
        _indent: Math.max(0, (a.level || 1) - 1),
      })),
    ...orphan.map((acc) => ({ acc, name: "(akun tidak terdaftar)", nilai: round2((values.get(acc) ?? 0) * sign) })),
  ];
}

type TB = { acc: string; name: string; accgroup: number; accinduk: string; level: number; awal: number; debet: number; kredit: number; akhir: number };
const trialBalance = (p: Params) => rpcAll<TB>("tka_neraca_saldo", { p_tahun: p.tahun, p_dari: p.bulanDari, p_sampai: p.bulanSampai });

// ── Receivables / payables ──
type Out = { id: number; nomor: string; tanggal: string; duedate: string; sub: string; subname: string; val: number; bayar: number; retur: number; sisa: number; umur: number; doc_id: number | null };

const posisi = (idCs: "C" | "S"): ReportDef["run"] => async (p) => {
  const rows = await rpcAll<Out>("tka_hp_outstanding", { p_id_cs: idCs, p_per: p.per, p_sub: null });
  const columns: Column[] = [
    { key: "sub", label: "Kode" },
    { key: "subname", label: idCs === "C" ? "Customer" : "Supplier" },
    { key: "jml", label: "Jml Nota", num: true, decimals: 0 },
    { key: "val", label: "Nilai Nota", num: true, sum: true },
    { key: "bayar", label: "Dibayar", num: true, sum: true },
    { key: "sisa", label: "Sisa", num: true, sum: true },
  ];
  const g = groupSum(rows, (r) => r.sub, (r) => ({ sub: r.sub, subname: r.subname, jml: 0, val: 0, bayar: 0, sisa: 0 }), (a, r) => {
    a.jml = n(a.jml) + 1;
    a.val = round2(n(a.val) + n(r.val));
    a.bayar = round2(n(a.bayar) + n(r.bayar) + n(r.retur));
    a.sisa = round2(n(a.sisa) + n(r.sisa));
  }).sort((a, b) => n(b.sisa) - n(a.sisa));
  return { columns, rows: withTotal(columns, g), subtitle: `Per ${fmtD(p.per)}` };
};

const umur = (idCs: "C" | "S"): ReportDef["run"] => async (p) => {
  const rows = await rpcAll<Out>("tka_hp_outstanding", { p_id_cs: idCs, p_per: p.per, p_sub: (idCs === "C" ? p.cus : p.sup) || null });
  const columns: Column[] = [
    { key: "subname", label: idCs === "C" ? "Customer" : "Supplier" },
    { key: "nomor", label: "Nota" },
    { key: "tanggal", label: "Tanggal" },
    { key: "duedate", label: "Jatuh Tempo" },
    { key: "umur", label: "Umur (hari)", num: true, decimals: 0 },
    { key: "b0", label: "Belum JT", num: true, sum: true },
    { key: "b30", label: "1-30", num: true, sum: true },
    { key: "b60", label: "31-60", num: true, sum: true },
    { key: "b90", label: "61-90", num: true, sum: true },
    { key: "bx", label: "> 90", num: true, sum: true },
    { key: "sisa", label: "Sisa", num: true, sum: true },
  ];
  const out = rows.map((r) => {
    const u = n(r.umur);
    const b = (cond: boolean) => (cond ? n(r.sisa) : 0);
    return {
      subname: r.subname, nomor: r.nomor, tanggal: fmtD(r.tanggal), duedate: fmtD(r.duedate), umur: u,
      b0: b(u <= 0), b30: b(u > 0 && u <= 30), b60: b(u > 30 && u <= 60), b90: b(u > 60 && u <= 90), bx: b(u > 90),
      sisa: n(r.sisa), _href: docHref(idCs === "C" ? "JLH" : "BLI", r.doc_id),
    };
  });
  return { columns, rows: withTotal(columns, out), subtitle: `Per ${fmtD(p.per)}` };
};

const kartuHp = (idCs: "C" | "S"): ReportDef["run"] => async (p) => {
  const sub = idCs === "C" ? p.cus : p.sup;
  if (!sub) throw new Error(`Pilih ${idCs === "C" ? "customer" : "supplier"} dulu.`);
  type K = { tanggal: string; jenis: string; nomor: string; nota: string; rem: string; tambah: number; kurang: number; saldo: number; doc_id: number | null };
  const rows = await rpcAll<K>("tka_hp_kartu", { p_id_cs: idCs, p_sub: sub, p_dari: p.dari, p_sampai: p.sampai });
  const columns: Column[] = [
    { key: "tanggal", label: "Tanggal" },
    { key: "jenis", label: "Jenis" },
    { key: "nomor", label: "Nomor" },
    { key: "nota", label: "Nota" },
    { key: "rem", label: "Keterangan" },
    { key: "tambah", label: idCs === "C" ? "Piutang" : "Hutang", num: true, sum: true },
    { key: "kurang", label: "Bayar/Retur", num: true, sum: true },
    { key: "saldo", label: "Saldo", num: true },
  ];
  return {
    columns,
    rows: withTotal(columns, rows.map((r) => ({ ...r, tanggal: fmtD(r.tanggal), _style: r.jenis === "AWAL" ? "bold" : undefined }))),
    subtitle: `${sub} · ${rangeLabel(p)}`,
  };
};

// ── Stock ──
type Stok = { gol: string; inv: string; name: string; unit: string; golid: string; q_awal: number; q_in: number; q_out: number; q_akhir: number; v_awal: number; v_in: number; v_out: number; v_akhir: number };

const posisiStok = (mode: "qty" | "val"): ReportDef["run"] => async (p) => {
  const rows = (await rpcAll<Stok>("tka_posisi_stok", { p_tahun: p.tahun, p_dari: p.bulanDari, p_sampai: p.bulanSampai }))
    .filter((r) => !p.jenisStok || r.golid === p.jenisStok)
    .filter((r) => [r.q_awal, r.q_in, r.q_out, r.q_akhir, r.v_awal, r.v_akhir].some((v) => Math.abs(n(v)) >= 0.005));
  const pre = mode === "qty" ? "q" : "v";
  const columns: Column[] = [
    { key: "gol", label: "Gol" },
    { key: "inv", label: "Kode" },
    { key: "name", label: "Nama Barang" },
    { key: "unit", label: "Sat" },
    { key: `${pre}_awal`, label: "Awal", num: true, sum: mode === "val" },
    { key: `${pre}_in`, label: "Masuk", num: true, sum: mode === "val" },
    { key: `${pre}_out`, label: "Keluar", num: true, sum: mode === "val" },
    { key: `${pre}_akhir`, label: "Akhir", num: true, sum: mode === "val" },
  ];
  if (mode === "val") columns.push({ key: "avg", label: "Harga Rata2", num: true });
  const out = rows.map((r) => ({
    ...r,
    avg: n(r.q_akhir) ? round2(n(r.v_akhir) / n(r.q_akhir)) : 0,
    _href: `/admin/tka/laporan/kartu-persediaan?gol=${encodeURIComponent(r.gol)}&inv=${encodeURIComponent(r.inv)}&tahun=${p.tahun}`,
  }));
  return { columns, rows: withTotal(columns, out), subtitle: periodLabel(p) };
};

export const REPORTS: ReportDef[] = [
  // ── Penjualan ──
  {
    key: "laporan-penjualan",
    title: "Laporan Penjualan (per Nota)",
    group: "Penjualan",
    params: ["tanggal", "cus"],
    run: async (p) => {
      const rows = (await docs(["JLH"], p)).filter((r) => !p.cus || r.sub === p.cus);
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "No. Nota" },
        { key: "sjno", label: "No. SJ" },
        { key: "subname", label: "Customer" },
        { key: "paid", label: "Bayar" },
        { key: "bruto", label: "Bruto", num: true, sum: true },
        { key: "discval", label: "Diskon", num: true, sum: true },
        { key: "ppnval", label: "PPN", num: true, sum: true },
        { key: "netto", label: "Netto", num: true, sum: true },
      ];
      const out = rows.map((r) => ({
        tanggal: fmtD(r.tanggal), nomor: r.nomor, sjno: r.h?.sjno ?? "", subname: r.subname, paid: r.h?.paid ?? "",
        bruto: n(r.h?.bruto) || n(r.total), discval: n(r.h?.discval), ppnval: n(r.h?.ppnval), netto: n(r.total), _href: docHref("JLH", r.id),
      }));
      return { columns, rows: withTotal(columns, out), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-penjualan-customer",
    title: "Rekap Penjualan per Customer",
    group: "Penjualan",
    params: ["tanggal"],
    run: async (p) => {
      const rows = await docs(["JLH", "RJL"], p);
      const columns: Column[] = [
        { key: "sub", label: "Kode" },
        { key: "subname", label: "Customer" },
        { key: "jml", label: "Jml Nota", num: true, decimals: 0 },
        { key: "jual", label: "Penjualan", num: true, sum: true },
        { key: "retur", label: "Retur", num: true, sum: true },
        { key: "bersih", label: "Bersih", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => r.sub, (r) => ({ sub: r.sub, subname: r.subname, jml: 0, jual: 0, retur: 0, bersih: 0 }), (a, r) => {
        if (r.jnl === "JLH") { a.jml = n(a.jml) + 1; a.jual = round2(n(a.jual) + n(r.total)); }
        else a.retur = round2(n(a.retur) + n(r.total));
        a.bersih = round2(n(a.jual) - n(a.retur));
      }).sort((a, b) => n(b.bersih) - n(a.bersih));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-penjualan-golongan",
    title: "Rekap Penjualan per Golongan",
    group: "Penjualan",
    params: ["tanggal"],
    run: async (p) => {
      const [rows, gols] = await Promise.all([lines(["JLH"], p), lookups.gol()]);
      const gname = new Map(gols.map((g) => [g.gol, g.name]));
      const columns: Column[] = [
        { key: "gol", label: "Gol" },
        { key: "name", label: "Golongan" },
        { key: "qty", label: "Qty", num: true, sum: true },
        { key: "val", label: "Penjualan", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => r.gol || "(eceran)", (r) => ({ gol: r.gol || "-", name: gname.get(r.gol) ?? (r.gol ? "" : "Eceran / tanpa kode"), qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qty));
        a.val = round2(n(a.val) + n(r.val));
      }).sort((a, b) => String(a.gol).localeCompare(String(b.gol)));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-penjualan-barang",
    title: "Rekap Penjualan per Barang",
    group: "Penjualan",
    params: ["tanggal", "cus"],
    run: async (p) => {
      const rows = (await lines(["JLH"], p)).filter((r) => !p.cus || r.sub === p.cus);
      const columns: Column[] = [
        { key: "gol", label: "Gol" },
        { key: "inv", label: "Kode" },
        { key: "invname", label: "Nama Barang" },
        { key: "unit", label: "Sat" },
        { key: "qty", label: "Qty", num: true },
        { key: "val", label: "Penjualan", num: true, sum: true },
        { key: "avg", label: "Harga Rata2", num: true },
      ];
      const g = groupSum(rows, (r) => `${r.gol}|${r.inv || r.invname}`, (r) => ({ gol: r.gol, inv: r.inv, invname: r.invname, unit: r.unit, qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qty));
        a.val = round2(n(a.val) + n(r.val));
        a.avg = n(a.qty) ? round2(n(a.val) / n(a.qty)) : 0;
      }).sort((a, b) => n(b.val) - n(a.val));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-penjualan-po",
    title: "Rekap Penjualan per P.O.",
    group: "Penjualan",
    params: ["tanggal", "cus"],
    run: async (p) => {
      const rows = (await lines(["JLH"], p)).filter((r) => !p.cus || r.sub === p.cus);
      const columns: Column[] = [
        { key: "noorder", label: "No. PO" },
        { key: "subname", label: "Customer" },
        { key: "nota", label: "Nota" },
        { key: "qty", label: "Qty", num: true, sum: true },
        { key: "val", label: "Penjualan", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => `${r.sub}|${String(r.d?.noorder ?? "")}`, (r) => ({ noorder: String(r.d?.noorder ?? "") || "(tanpa PO)", subname: r.subname, nota: "", qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qty));
        a.val = round2(n(a.val) + n(r.val));
        const notas = new Set(String(a.nota).split(", ").filter(Boolean));
        notas.add(r.nomor);
        a.nota = Array.from(notas).join(", ");
      });
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-retur-penjualan",
    title: "Rekap Retur Penjualan",
    group: "Penjualan",
    params: ["tanggal"],
    run: async (p) => {
      const rows = await lines(["RJL"], p);
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "No. Retur" },
        { key: "subname", label: "Customer" },
        { key: "nota", label: "Nota" },
        { key: "invname", label: "Barang" },
        { key: "qty", label: "Qty", num: true },
        { key: "val", label: "Nilai", num: true, sum: true },
      ];
      return { columns, rows: withTotal(columns, rows.map((r) => ({ ...r, tanggal: fmtD(r.tanggal), _href: docHref("RJL", r.doc_id) }))), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "outstanding-order",
    title: "Daftar Outstanding Order",
    group: "Penjualan",
    params: ["tahun"],
    run: async (p) => {
      type O = { doc_id: number; jnl: string; nomor: string; tanggal: string; sub: string; subname: string; noorder: string; gol: string; inv: string; invname: string; unit: string; price: number; qty_order: number; qty_kirim: number; qty_sisa: number };
      const rows = await rpcAll<O>("tka_outstanding_order", { p_tahun: p.tahun });
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "No. Order" },
        { key: "subname", label: "Customer" },
        { key: "noorder", label: "No. PO" },
        { key: "invname", label: "Barang" },
        { key: "qty_order", label: "Order", num: true },
        { key: "qty_kirim", label: "Terkirim", num: true },
        { key: "qty_sisa", label: "Sisa", num: true },
        { key: "nilai", label: "Nilai Sisa", num: true, sum: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ ...r, tanggal: fmtD(r.tanggal), nilai: round2(n(r.qty_sisa) * n(r.price)), _href: docHref(r.jnl, r.doc_id) }))),
        subtitle: `Order tahun ${p.tahun}`,
      };
    },
  },
  // ── Pembelian ──
  {
    key: "rekap-pembelian",
    title: "Rekap Pembelian (per Faktur)",
    group: "Pembelian",
    params: ["tanggal", "sup"],
    run: async (p) => {
      const rows = (await docs(["BLI"], p)).filter((r) => !p.sup || r.sub === p.sup);
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "No. Faktur" },
        { key: "subname", label: "Supplier" },
        { key: "duedate", label: "Jatuh Tempo" },
        { key: "bruto", label: "Bruto", num: true, sum: true },
        { key: "ppnval", label: "PPN", num: true, sum: true },
        { key: "netto", label: "Netto", num: true, sum: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ tanggal: fmtD(r.tanggal), nomor: r.nomor, subname: r.subname, duedate: fmtD(String(r.h?.duedate ?? "")), bruto: n(r.h?.bruto) || n(r.total), ppnval: n(r.h?.ppnval), netto: n(r.total), _href: docHref("BLI", r.id) }))),
        subtitle: rangeLabel(p),
      };
    },
  },
  {
    key: "rekap-pembelian-supplier",
    title: "Rekap Pembelian per Supplier",
    group: "Pembelian",
    params: ["tanggal"],
    run: async (p) => {
      const rows = await docs(["BLI", "RBL"], p);
      const columns: Column[] = [
        { key: "sub", label: "Kode" },
        { key: "subname", label: "Supplier" },
        { key: "jml", label: "Jml Faktur", num: true, decimals: 0 },
        { key: "beli", label: "Pembelian", num: true, sum: true },
        { key: "retur", label: "Retur", num: true, sum: true },
        { key: "bersih", label: "Bersih", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => r.sub, (r) => ({ sub: r.sub, subname: r.subname, jml: 0, beli: 0, retur: 0, bersih: 0 }), (a, r) => {
        if (r.jnl === "BLI") { a.jml = n(a.jml) + 1; a.beli = round2(n(a.beli) + n(r.total)); }
        else a.retur = round2(n(a.retur) + n(r.total));
        a.bersih = round2(n(a.beli) - n(a.retur));
      }).sort((a, b) => n(b.bersih) - n(a.bersih));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-pembelian-stock",
    title: "Rekap Pembelian per Stock",
    group: "Pembelian",
    params: ["tanggal"],
    run: async (p) => {
      const rows = await lines(["BLI"], p);
      const columns: Column[] = [
        { key: "gol", label: "Gol" },
        { key: "inv", label: "Kode" },
        { key: "invname", label: "Nama Bahan" },
        { key: "unit", label: "Sat" },
        { key: "qty", label: "Qty", num: true },
        { key: "val", label: "Nilai", num: true, sum: true },
        { key: "avg", label: "Harga Rata2", num: true },
      ];
      const g = groupSum(rows, (r) => `${r.gol}|${r.inv}`, (r) => ({ gol: r.gol, inv: r.inv, invname: r.invname, unit: r.unit, qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qty));
        a.val = round2(n(a.val) + n(r.val));
        a.avg = n(a.qty) ? round2(n(a.val) / n(a.qty)) : 0;
      });
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  // ── Kas / Bank ──
  ...(["masuk", "keluar"] as const).map<ReportDef>((arah) => ({
    key: `rekap-kas-bank-${arah}`,
    title: `Rekap Jurnal Kas/Bank ${arah === "masuk" ? "Masuk" : "Keluar"}`,
    group: "Kas / Bank",
    params: ["tanggal"],
    run: async (p) => {
      const [rows, { byAcc }] = await Promise.all([lines(arah === "masuk" ? ["KM", "BM"] : ["KK", "BK"], p), accTree()]);
      const columns: Column[] = [
        { key: "acc", label: "Akun" },
        { key: "name", label: "Nama Akun" },
        { key: "debet", label: "Debet", num: true, sum: true },
        { key: "kredit", label: "Kredit", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => r.acc, (r) => ({ acc: r.acc, name: byAcc.get(r.acc)?.name ?? "", debet: 0, kredit: 0 }), (a, r) => {
        if (r.dk === "D") a.debet = round2(n(a.debet) + n(r.val));
        else a.kredit = round2(n(a.kredit) + n(r.val));
      }).sort((a, b) => String(a.acc).localeCompare(String(b.acc)));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  })),
  {
    key: "laporan-jurnal-kas-bank",
    title: "Laporan Jurnal Kas/Bank (detail)",
    group: "Kas / Bank",
    params: ["tanggal", "acc"],
    run: async (p) => {
      const rows = (await lines(["KM", "KK", "BM", "BK"], p)).filter((r) => !p.acc || r.acc === p.acc);
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "Bukti" },
        { key: "acc", label: "Akun" },
        { key: "rem", label: "Keterangan" },
        { key: "nota", label: "Nota" },
        { key: "debet", label: "Debet", num: true, sum: true },
        { key: "kredit", label: "Kredit", num: true, sum: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ tanggal: fmtD(r.tanggal), nomor: r.nomor, acc: r.acc, rem: r.rem, nota: r.nota, debet: r.dk === "D" ? n(r.val) : 0, kredit: r.dk === "K" ? n(r.val) : 0, _href: docHref(r.jnl, r.doc_id) }))),
        subtitle: rangeLabel(p),
      };
    },
  },
  {
    key: "giro-outstanding",
    title: "Daftar Cek/Giro Belum Cair",
    group: "Kas / Bank",
    params: [],
    run: async () => {
      type G = { bg: string; bank: string; bgdue: string; bgval: number; subname: string; nomor: string; status: string; tanggal: string };
      const rows = await fetchAll<G>((a, b) => db().from("tka_giro").select("bg,bank,bgdue,bgval,subname,nomor,status,tanggal").eq("cair", "").order("bgdue").range(a, b));
      const columns: Column[] = [
        { key: "jenis", label: "Jenis" },
        { key: "bg", label: "No. Cek/Giro" },
        { key: "bank", label: "Bank" },
        { key: "bgdue", label: "Jatuh Tempo" },
        { key: "subname", label: "Dari / Kepada" },
        { key: "nomor", label: "Bukti" },
        { key: "bgval", label: "Nilai", num: true, sum: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ ...r, jenis: r.status === "1" ? "Keluar" : "Masuk", bgdue: fmtD(r.bgdue) }))),
        subtitle: "Semua giro terbuka",
      };
    },
  },
  // ── Hutang / Piutang ──
  { key: "posisi-piutang", title: "Posisi Piutang Customer", group: "Hutang / Piutang", params: ["per"], run: posisi("C") },
  { key: "umur-piutang", title: "Daftar Umur Piutang Customer", group: "Hutang / Piutang", params: ["per", "cus"], run: umur("C") },
  { key: "kartu-piutang", title: "Kartu Piutang Customer", group: "Hutang / Piutang", params: ["cus", "tanggal"], run: kartuHp("C") },
  { key: "posisi-hutang", title: "Posisi Hutang Supplier", group: "Hutang / Piutang", params: ["per"], run: posisi("S") },
  { key: "umur-hutang", title: "Daftar Umur Hutang Supplier", group: "Hutang / Piutang", params: ["per", "sup"], run: umur("S") },
  { key: "kartu-hutang", title: "Kartu Hutang Supplier", group: "Hutang / Piutang", params: ["sup", "tanggal"], run: kartuHp("S") },
  // ── Produksi & Persediaan ──
  {
    key: "rekap-hasil-produksi",
    title: "Rekap Hasil Produksi",
    group: "Produksi & Persediaan",
    params: ["tanggal"],
    run: async (p) => {
      type M = { gol: string; inv: string; unit: string; qin: number; vin: number };
      const [rows, invs] = await Promise.all([
        fetchAll<M>((a, b) => db().from("tka_mutasi").select("gol,inv,unit,qin,vin").eq("jnl", "BHP").gte("tanggal", p.dari).lte("tanggal", p.sampai).range(a, b)),
        lookups.inv(),
      ]);
      const name = new Map(invs.map((i) => [`${i.gol}|${i.inv}`, i.name]));
      const columns: Column[] = [
        { key: "gol", label: "Gol" },
        { key: "inv", label: "Kode" },
        { key: "name", label: "Barang Jadi" },
        { key: "unit", label: "Sat" },
        { key: "qty", label: "Qty", num: true },
        { key: "val", label: "Nilai (HPP)", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => `${r.gol}|${r.inv}`, (r) => ({ gol: r.gol, inv: r.inv, name: name.get(`${r.gol}|${r.inv}`) ?? "", unit: r.unit, qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qin));
        a.val = round2(n(a.val) + n(r.vin));
      }).sort((a, b) => `${a.gol}${a.inv}`.localeCompare(`${b.gol}${b.inv}`));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "rekap-produksi-per-orang",
    title: "Rekap Produksi per Orang",
    group: "Produksi & Persediaan",
    params: ["tanggal"],
    run: async (p) => {
      const [rows, workers] = await Promise.all([lines(["BHP"], p), lookups.pekerja()]);
      const wname = new Map(workers.map((w) => [w.tka, w.name]));
      const columns: Column[] = [
        { key: "tka", label: "Kode", },
        { key: "name", label: "Pekerja" },
        { key: "invname", label: "Barang" },
        { key: "qty", label: "Qty", num: true },
        { key: "val", label: "Upah", num: true, sum: true },
      ];
      const detail = groupSum(rows, (r) => `${r.tka || r.sub}|${r.gol}|${r.inv}`, (r) => ({ tka: r.tka || r.sub, name: wname.get(r.tka || r.sub) ?? String(r.d?.tkaname ?? r.subname), invname: r.invname, qty: 0, val: 0 }), (a, r) => {
        a.qty = round2(n(a.qty) + n(r.qty));
        a.val = round2(n(a.val) + n(r.val));
      }).sort((a, b) => `${a.name}${a.invname}`.localeCompare(`${b.name}${b.invname}`));
      const out: ReportRow[] = [];
      let cur = "";
      let sub = 0;
      for (const r of detail) {
        if (r.tka !== cur) {
          if (cur) out.push({ tka: "", name: "", invname: "Subtotal", qty: "", val: round2(sub), _style: "bold" });
          cur = String(r.tka);
          sub = 0;
        }
        sub += n(r.val);
        out.push(r);
      }
      if (cur) out.push({ tka: "", name: "", invname: "Subtotal", qty: "", val: round2(sub), _style: "bold" });
      const total = round2(detail.reduce((s, r) => s + n(r.val), 0));
      out.push({ tka: "TOTAL", val: total, _style: "total" });
      return { columns, rows: out, subtitle: rangeLabel(p) };
    },
  },
  { key: "posisi-persediaan-qty", title: "Posisi Persediaan (Qty)", group: "Produksi & Persediaan", params: ["periode", "jenisStok"], run: posisiStok("qty") },
  { key: "posisi-persediaan-value", title: "Posisi Persediaan (Value)", group: "Produksi & Persediaan", params: ["periode", "jenisStok"], run: posisiStok("val") },
  {
    key: "kartu-persediaan",
    title: "Kartu Persediaan (Qty & Value)",
    group: "Produksi & Persediaan",
    params: ["inv", "tanggal"],
    run: async (p) => {
      if (!p.inv) throw new Error("Pilih barang dulu.");
      type K = { tanggal: string; jnl: string; nomor: string; sub: string; subname: string; price: number; qin: number; qout: number; q_saldo: number; vin: number; vout: number; v_saldo: number; doc_id: number | null };
      const rows = await rpcAll<K>("tka_kartu_stok", { p_gol: p.gol, p_inv: p.inv, p_dari: p.dari, p_sampai: p.sampai });
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "jnl", label: "Jenis" },
        { key: "nomor", label: "Nomor" },
        { key: "subname", label: "Keterangan" },
        { key: "qin", label: "Masuk", num: true, sum: true },
        { key: "qout", label: "Keluar", num: true, sum: true },
        { key: "q_saldo", label: "Saldo Qty", num: true },
        { key: "vin", label: "Nilai Masuk", num: true, sum: true },
        { key: "vout", label: "Nilai Keluar", num: true, sum: true },
        { key: "v_saldo", label: "Saldo Nilai", num: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ ...r, tanggal: fmtD(r.tanggal), _style: r.jnl === "AWAL" ? "bold" : undefined, _href: r.doc_id ? docHref(r.jnl === "OPN" ? "KOR" : r.jnl, r.doc_id) : undefined }))),
        subtitle: `${p.gol} / ${p.inv} · ${rangeLabel(p)}`,
      };
    },
  },
  {
    key: "harga-pokok",
    title: "Harga Pokok Persediaan",
    group: "Produksi & Persediaan",
    params: ["jenisStok"],
    run: async (p) => {
      const [invs, gols] = await Promise.all([lookups.inv(), lookups.gol()]);
      const gid = new Map(gols.map((g) => [g.gol, g.id]));
      const columns: Column[] = [
        { key: "gol", label: "Gol" },
        { key: "inv", label: "Kode" },
        { key: "name", label: "Nama Barang" },
        { key: "unit", label: "Sat" },
        { key: "hppmin", label: "HPP Standar", num: true },
        { key: "ongkos", label: "Ongkos", num: true },
        { key: "price", label: "Harga Jual", num: true },
        { key: "margin", label: "Margin %", num: true },
      ];
      const rows = invs
        .filter((i) => !p.jenisStok || gid.get(i.gol) === p.jenisStok)
        .map((i) => ({ ...i, margin: n(i.price) ? round2(((n(i.price) - n(i.hppmin)) / n(i.price)) * 100) : 0 }));
      return { columns, rows, subtitle: "Data master persediaan saat ini" };
    },
  },
  // ── Keuangan ──
  {
    key: "rekap-jurnal",
    title: "Rekap Jurnal",
    group: "Laporan Keuangan",
    params: ["tanggal"],
    run: async (p) => {
      type J = { jnl: string; acc: string; debet: number; kredit: number };
      const [rows, { byAcc }] = await Promise.all([
        fetchAll<J>((a, b) => db().from("tka_jurnal").select("jnl,acc,debet,kredit").gte("tanggal", p.dari).lte("tanggal", p.sampai).order("id").range(a, b)),
        accTree(),
      ]);
      const label: Record<string, string> = { "498": "Kas Masuk", "499": "Bank Masuk", "500": "Kas Keluar", "501": "Bank Keluar", JLH: "Penjualan", BLI: "Pembelian", BHP: "Hasil Produksi", RGR: "Pencairan Giro", JNL: "Jurnal Umum", RJL: "Retur Jual", RBL: "Retur Beli", SLS: "Selisih Program Lama" };
      const columns: Column[] = [
        { key: "jnl", label: "Jurnal" },
        { key: "acc", label: "Akun" },
        { key: "name", label: "Nama Akun" },
        { key: "debet", label: "Debet", num: true, sum: true },
        { key: "kredit", label: "Kredit", num: true, sum: true },
      ];
      const g = groupSum(rows, (r) => `${r.jnl}|${r.acc}`, (r) => ({ jnl: label[r.jnl] ?? r.jnl, acc: r.acc, name: byAcc.get(r.acc)?.name ?? "", debet: 0, kredit: 0 }), (a, r) => {
        a.debet = round2(n(a.debet) + n(r.debet));
        a.kredit = round2(n(a.kredit) + n(r.kredit));
      }).sort((a, b) => `${a.jnl}${a.acc}`.localeCompare(`${b.jnl}${b.acc}`));
      return { columns, rows: withTotal(columns, g), subtitle: rangeLabel(p) };
    },
  },
  {
    key: "buku-besar",
    title: "Buku Besar / Rekening Koran",
    group: "Laporan Keuangan",
    params: ["acc", "tanggal"],
    run: async (p) => {
      if (!p.acc) throw new Error("Pilih akun dulu.");
      if (p.dari.slice(0, 4) !== p.sampai.slice(0, 4)) throw new Error("Periode buku besar harus dalam satu tahun.");
      type B = { tanggal: string; jnl: string; nomor: string; sub: string; subname: string; rem: string; bg: string; debet: number; kredit: number; saldo: number; doc_id: number | null };
      const rows = await rpcAll<B>("tka_buku_besar", { p_acc: p.acc, p_dari: p.dari, p_sampai: p.sampai });
      const columns: Column[] = [
        { key: "tanggal", label: "Tanggal" },
        { key: "nomor", label: "Bukti" },
        { key: "rem", label: "Keterangan" },
        { key: "bg", label: "Cek/Giro" },
        { key: "debet", label: "Debet", num: true, sum: true },
        { key: "kredit", label: "Kredit", num: true, sum: true },
        { key: "saldo", label: "Saldo", num: true },
      ];
      const jnlDoc: Record<string, string> = { "498": "KM", "499": "BM", "500": "KK", "501": "BK" };
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ ...r, tanggal: fmtD(r.tanggal), rem: r.subname && r.jnl !== "AWAL" ? `${r.rem} · ${r.subname}` : r.rem, _style: r.jnl === "AWAL" ? "bold" : undefined, _href: r.doc_id ? docHref(jnlDoc[r.jnl] ?? r.jnl, r.doc_id) : undefined }))),
        subtitle: `${p.acc} · ${rangeLabel(p)}`,
      };
    },
  },
  {
    key: "neraca-percobaan",
    title: "Neraca Percobaan",
    group: "Laporan Keuangan",
    params: ["periode"],
    run: async (p) => {
      const rows = (await trialBalance(p)).filter((r) => [r.awal, r.debet, r.kredit, r.akhir].some((v) => Math.abs(n(v)) >= 0.005));
      const columns: Column[] = [
        { key: "acc", label: "Akun" },
        { key: "name", label: "Nama Akun" },
        { key: "awal", label: "Saldo Awal", num: true, sum: true },
        { key: "debet", label: "Debet", num: true, sum: true },
        { key: "kredit", label: "Kredit", num: true, sum: true },
        { key: "akhir", label: "Saldo Akhir", num: true, sum: true },
      ];
      return {
        columns,
        rows: withTotal(columns, rows.map((r) => ({ ...r, _href: `/admin/tka/laporan/buku-besar?acc=${encodeURIComponent(r.acc)}&tahun=${p.tahun}&bulanDari=${p.bulanDari}&bulanSampai=${p.bulanSampai}` }))),
        subtitle: periodLabel(p),
        note: "Saldo positif = debet, negatif = kredit.",
      };
    },
  },
  {
    key: "rugi-laba",
    title: "Laporan Rugi / Laba",
    group: "Laporan Keuangan",
    params: ["periode"],
    run: async (p) => {
      const [tb, { accs, byAcc }] = await Promise.all([trialBalance(p), accTree()]);
      const pl = tb.filter((r) => n(r.accgroup) >= 4);
      const values = new Map(pl.map((r) => [r.acc, round2(n(r.debet) - n(r.kredit))]));
      const columns: Column[] = [
        { key: "acc", label: "Akun" },
        { key: "name", label: "Keterangan" },
        { key: "nilai", label: "Jumlah", num: true },
      ];
      const sect = (label: string, groups: number[], sign: number) => {
        const v = new Map<string, number>(Array.from(values).filter(([acc]) => groups.includes(n(byAcc.get(acc)?.accgroup ?? pl.find((r) => r.acc === acc)?.accgroup))));
        const rows = rollup(v, accs, byAcc, (a) => groups.includes(a.accgroup), sign);
        const total = round2(Array.from(v.values()).reduce((s, x) => s + x, 0) * sign);
        return { rows: [{ acc: "", name: label, _style: "head" as const }, ...rows, { acc: "", name: `Total ${label}`, nilai: total, _style: "bold" as const }], total };
      };
      const jual = sect("PENJUALAN", [4], -1);
      const hpp = sect("HARGA POKOK & BIAYA", [5], 1);
      const plain = sect("PENDAPATAN LAIN-LAIN", [6], -1);
      const blain = sect("BIAYA LAIN-LAIN", [7], 1);
      const laba = round2(jual.total - hpp.total + plain.total - blain.total);
      return {
        columns,
        rows: [
          ...jual.rows,
          ...hpp.rows,
          { acc: "", name: "LABA KOTOR", nilai: round2(jual.total - hpp.total), _style: "total" },
          ...plain.rows,
          ...blain.rows,
          { acc: "", name: laba >= 0 ? "LABA BERSIH" : "RUGI BERSIH", nilai: laba, _style: "total" },
        ],
        subtitle: periodLabel(p),
      };
    },
  },
  {
    key: "neraca",
    title: "Neraca",
    group: "Laporan Keuangan",
    params: ["periode"],
    run: async (p) => {
      const ytd = { ...p, bulanDari: 1 };
      const [tb, { accs, byAcc }] = await Promise.all([trialBalance(ytd), accTree()]);
      const grp = (acc: string) => n(byAcc.get(acc)?.accgroup ?? tb.find((r) => r.acc === acc)?.accgroup);
      const vals = (groups: number[]) => new Map(tb.filter((r) => groups.includes(grp(r.acc))).map((r) => [r.acc, n(r.akhir)]));
      const labaBerjalan = round2(-tb.filter((r) => grp(r.acc) >= 4).reduce((s, r) => s + n(r.akhir), 0));
      const aktiva = vals([1]);
      const pasiva = vals([2, 3]);
      const totA = round2(Array.from(aktiva.values()).reduce((s, x) => s + x, 0));
      const totP = round2(-Array.from(pasiva.values()).reduce((s, x) => s + x, 0) + labaBerjalan);
      const columns: Column[] = [
        { key: "acc", label: "Akun" },
        { key: "name", label: "Keterangan" },
        { key: "nilai", label: "Jumlah", num: true },
      ];
      return {
        columns,
        rows: [
          { acc: "", name: "AKTIVA", _style: "head" },
          ...rollup(aktiva, accs, byAcc, (a) => a.accgroup === 1),
          { acc: "", name: "TOTAL AKTIVA", nilai: totA, _style: "total" },
          { acc: "", name: "HUTANG & MODAL", _style: "head" },
          ...rollup(pasiva, accs, byAcc, (a) => a.accgroup === 2 || a.accgroup === 3, -1),
          { acc: "", name: "Laba/Rugi Tahun Berjalan", nilai: labaBerjalan, _style: "bold" },
          { acc: "", name: "TOTAL HUTANG & MODAL", nilai: totP, _style: "total" },
        ],
        subtitle: `Per akhir ${NAMA_BULAN[p.bulanSampai - 1]} ${p.tahun}`,
        note: Math.abs(totA - totP) >= 1 ? `Selisih aktiva - pasiva: ${round2(totA - totP).toLocaleString("id-ID")} (berasal dari saldo awal program lama).` : undefined,
      };
    },
  },
];

export const REPORT_BY_KEY: Record<string, ReportDef> = Object.fromEntries(REPORTS.map((r) => [r.key, r]));
export const REPORT_GROUPS = Array.from(new Set(REPORTS.map((r) => r.group)));
