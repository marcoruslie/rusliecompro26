// Document types of the TKA module, mirroring the legacy menu
// (A. Transaksi Penjualan, B. Transaksi Pembelian, C. Produksi & Persediaan,
// Mutasi Kas/Bank). Each config drives the generic list, form and print layout.
import type { DocLine } from "./data";
import { round2 } from "./format";

export type SubKind = "cus" | "sup" | "pekerja";

export type HeaderField = {
  path: string; // nomor | tanggal | sub | rem | h.<key>
  label: string;
  type: "text" | "date" | "number" | "select" | "sub" | "readonly";
  options?: { value: string; label: string }[];
  span?: 1 | 2 | 3;
  placeholder?: string;
};

export type LineCol = {
  path: string; // DocLine column or d.<key>
  label: string;
  type: "inv" | "acc" | "pekerja" | "text" | "number" | "select" | "date";
  options?: { value: string; label: string }[];
  width?: string;
  readOnly?: boolean;
  print?: boolean; // shown on the printout (default true for non-technical columns)
  decimals?: number;
};

export type DocContext = { priceField: "price" | "pricebl" | null };

export type DocConfig = {
  jnl: string;
  title: string;
  short: string;
  group: "Penjualan" | "Pembelian" | "Produksi & Persediaan" | "Kas / Bank";
  sub: SubKind | null;
  subLabel?: string;
  subRequired?: boolean;
  header: HeaderField[];
  cols: LineCol[];
  ctx: DocContext;
  newLine: () => Partial<DocLine>;
  calcLine?: (l: DocLine) => DocLine;
  /** Header values derived from the lines (total + legacy fields like bruto/netto). */
  calcTotal: (h: Record<string, unknown>, lines: DocLine[]) => { total: number; h: Record<string, unknown> };
  balanced?: boolean; // ledger vouchers: debet must equal kredit
  printTitle: string;
  extraPrints?: { key: string; label: string }[];
};

const LOC = { path: "h.loc", label: "Lokasi", type: "text" as const, placeholder: "01" };
const sum = (lines: DocLine[], f: (l: DocLine) => number) => round2(lines.reduce((s, l) => s + f(l), 0));
const n = (v: unknown) => Number(v ?? 0) || 0;

const DK_OPTS = [
  { value: "D", label: "D" },
  { value: "K", label: "K" },
];
const TK_OPTS = [
  { value: "", label: "Partai" },
  { value: "E", label: "Eceran" },
  { value: "T", label: "Toko" },
];

const qtyPrice = (l: DocLine): DocLine => ({ ...l, val: round2(n(l.qty) * n(l.price)) });

// Vouchers: header total is the debit side (= credit side when balanced).
const voucherTotal = (h: Record<string, unknown>, lines: DocLine[]) => ({
  total: sum(lines, (l) => (l.dk === "D" ? n(l.val) : 0)),
  h,
});

const VOUCHER_COLS: LineCol[] = [
  { path: "acc", label: "Akun", type: "acc", width: "w-44" },
  { path: "rem", label: "Keterangan", type: "text", width: "min-w-[220px]" },
  { path: "nota", label: "No. Nota", type: "text", width: "w-28" },
  { path: "d.bg", label: "No. Cek/Giro", type: "text", width: "w-32" },
  { path: "d.bank", label: "Bank Giro", type: "text", width: "w-28", print: false },
  { path: "d.bgdue", label: "Jatuh Tempo", type: "date", width: "w-36", print: false },
  { path: "dk", label: "D/K", type: "select", options: DK_OPTS, width: "w-16" },
  { path: "val", label: "Jumlah", type: "number", width: "w-36" },
];

const voucher = (
  jnl: string,
  title: string,
  short: string,
  sub: SubKind,
  printTitle: string
): DocConfig => ({
  jnl,
  title,
  short,
  group: "Kas / Bank",
  sub,
  subLabel: sub === "cus" ? "Customer" : "Supplier",
  header: [
    { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
    { path: "tanggal", label: "Tanggal", type: "date" },
    { path: "sub", label: sub === "cus" ? "Customer (opsional)" : "Supplier (opsional)", type: "sub", span: 2 },
    { path: "rem", label: "Keterangan", type: "text", span: 2 },
    { path: "h.lampiran", label: "Lampiran", type: "number" },
  ],
  cols:
    jnl === "KK" || jnl === "BK"
      ? [
          ...VOUCHER_COLS.slice(0, 2),
          { path: "tka", label: "Pekerja", type: "pekerja", width: "w-40", print: false },
          { path: "jnlno", label: "No. Hasil Prod.", type: "text", width: "w-28", print: false },
          ...VOUCHER_COLS.slice(2),
        ]
      : VOUCHER_COLS,
  ctx: { priceField: null },
  newLine: () => ({ dk: jnl === "KM" || jnl === "BM" ? "K" : "D" }),
  calcTotal: voucherTotal,
  balanced: true,
  printTitle,
});

export const DOCS: DocConfig[] = [
  {
    jnl: "POP",
    title: "Order Pemesanan Partai",
    short: "Order Partai",
    group: "Penjualan",
    sub: "cus",
    subLabel: "Customer",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Customer", type: "sub", span: 2 },
      { path: "h.noorder", label: "No. PO Customer", type: "text" },
      { path: "h.duedate", label: "Tgl Kirim", type: "date" },
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "d.nogudang", label: "No. Gudang", type: "text", width: "w-36" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: "price" },
    newLine: () => ({}),
    calcLine: qtyPrice,
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => n(l.val)), h }),
    printTitle: "ORDER PEMESANAN",
  },
  {
    jnl: "POE",
    title: "Order Pemesanan Eceran",
    short: "Order Eceran",
    group: "Penjualan",
    sub: "cus",
    subLabel: "Customer",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Customer", type: "sub", span: 2 },
      { path: "h.duedate", label: "Tgl Selesai", type: "date" },
      { path: "h.tk", label: "Jenis", type: "select", options: [{ value: "E", label: "Eceran" }, { value: "T", label: "Toko" }] },
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "invname", label: "Nama Barang", type: "text", width: "min-w-[220px]" },
      { path: "d.jenis", label: "Bahan", type: "text", width: "w-16" },
      { path: "d.ukuran", label: "Ukuran", type: "text", width: "w-36" },
      { path: "d.berat", label: "Berat", type: "number", width: "w-24" },
      { path: "d.ongkos", label: "Ongkos/Pcs", type: "number", width: "w-28", print: false },
      { path: "qty", label: "Qty", type: "number", width: "w-24" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: "price" },
    newLine: () => ({ unit: "PCS" }),
    calcLine: qtyPrice,
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => n(l.val)), h: { tk: "E", ...h } }),
    printTitle: "ORDER PEMESANAN ECERAN",
  },
  {
    jnl: "JLH",
    title: "Nota Penjualan & Surat Jalan",
    short: "Nota Penjualan",
    group: "Penjualan",
    sub: "cus",
    subLabel: "Customer",
    subRequired: true,
    header: [
      { path: "nomor", label: "No. Nota", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Customer", type: "sub", span: 2 },
      { path: "h.sjno", label: "No. Surat Jalan", type: "text" },
      { path: "h.paid", label: "Pembayaran", type: "select", options: [{ value: "KONTAN", label: "KONTAN" }, { value: "KREDIT", label: "KREDIT" }] },
      { path: "h.duedate", label: "Jatuh Tempo", type: "date" },
      LOC,
      { path: "h.disc", label: "Diskon %", type: "number" },
      { path: "h.ppnval", label: "PPN (Rp)", type: "number" },
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "jnlno", label: "No. Order", type: "text", width: "w-24", print: false },
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "d.noorder", label: "No. PO", type: "text", width: "w-32" },
      { path: "d.tk", label: "Jenis", type: "select", options: TK_OPTS, width: "w-24", print: false },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36", readOnly: true },
      { path: "d.hpp", label: "HPP/Unit", type: "number", width: "w-28", print: false },
    ],
    ctx: { priceField: "price" },
    newLine: () => ({}),
    calcLine: qtyPrice,
    calcTotal: (h, lines) => {
      const bruto = sum(lines, (l) => n(l.val));
      const discval = round2((bruto * n(h.disc)) / 100);
      const ppnval = round2(n(h.ppnval));
      const netto = round2(bruto - discval + ppnval);
      return { total: netto, h: { paid: "KONTAN", ...h, bruto, discval, ppnval, netto, ppn: ppnval ? "2" : "1" } };
    },
    printTitle: "N O T A",
    extraPrints: [{ key: "sj", label: "Surat Jalan" }],
  },
  {
    jnl: "RJL",
    title: "Retur Nota Penjualan",
    short: "Retur Penjualan",
    group: "Penjualan",
    sub: "cus",
    subLabel: "Customer",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor Retur", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Customer", type: "sub", span: 2 },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "nota", label: "No. Nota", type: "text", width: "w-28" },
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: "price" },
    newLine: () => ({}),
    calcLine: qtyPrice,
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => n(l.val)), h }),
    printTitle: "RETUR PENJUALAN",
  },
  {
    jnl: "BPB",
    title: "Penerimaan Barang (BPB)",
    short: "Penerimaan Barang",
    group: "Pembelian",
    sub: "sup",
    subLabel: "Supplier",
    subRequired: true,
    header: [
      { path: "nomor", label: "No. BPB", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Supplier", type: "sub", span: 2 },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "d.coil", label: "Coil", type: "number", width: "w-20" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "rem", label: "Keterangan", type: "text", width: "w-40" },
    ],
    ctx: { priceField: null },
    newLine: () => ({}),
    calcTotal: (h) => ({ total: 0, h }),
    printTitle: "BUKTI PENERIMAAN BARANG",
  },
  {
    jnl: "BLI",
    title: "Faktur Pembelian",
    short: "Faktur Pembelian",
    group: "Pembelian",
    sub: "sup",
    subLabel: "Supplier",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Supplier", type: "sub", span: 2 },
      { path: "h.duedate", label: "Jatuh Tempo", type: "date" },
      { path: "h.ppnval", label: "PPN (Rp)", type: "number" },
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "jnlno", label: "No. BPB", type: "text", width: "w-24" },
      { path: "d.jnldate", label: "Tgl BPB", type: "date", width: "w-36", print: false },
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "d.coil", label: "Coil", type: "number", width: "w-20" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "d.disc", label: "Disc %", type: "number", width: "w-20" },
      { path: "val", label: "Netto", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: "pricebl" },
    newLine: () => ({}),
    calcLine: (l) => {
      const bruto = round2(n(l.qty) * n(l.price));
      return { ...l, val: round2(bruto * (1 - n(l.d.disc) / 100)), d: { ...l.d, bruto } };
    },
    calcTotal: (h, lines) => {
      const bruto = sum(lines, (l) => n(l.d.bruto) || n(l.val));
      const net = sum(lines, (l) => n(l.val));
      const ppnval = round2(n(h.ppnval));
      return {
        total: round2(net + ppnval),
        h: { ...h, bruto, discval: round2(bruto - net), ppnval, netto: round2(net + ppnval), ppn: ppnval ? "2" : "1" },
      };
    },
    printTitle: "FAKTUR PEMBELIAN",
  },
  {
    jnl: "RBL",
    title: "Retur Faktur Pembelian",
    short: "Retur Pembelian",
    group: "Pembelian",
    sub: "sup",
    subLabel: "Supplier",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor Retur", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Supplier", type: "sub", span: 2 },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "nota", label: "No. Faktur", type: "text", width: "w-28" },
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "price", label: "Harga", type: "number", width: "w-32" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: "pricebl" },
    newLine: () => ({}),
    calcLine: qtyPrice,
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => n(l.val)), h }),
    printTitle: "RETUR PEMBELIAN",
  },
  {
    jnl: "BBK",
    title: "Pengeluaran Bahan Baku ke Pekerja",
    short: "Bahan Keluar",
    group: "Produksi & Persediaan",
    sub: "pekerja",
    subLabel: "Pekerja",
    subRequired: true,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Pekerja", type: "sub", span: 2 },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "inv", label: "Bahan", type: "inv", width: "min-w-[260px]" },
      { path: "d.dmeter", label: "Diameter", type: "number", width: "w-24" },
      { path: "d.coil", label: "Coil", type: "number", width: "w-20" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "rem", label: "Untuk", type: "text", width: "w-44" },
    ],
    ctx: { priceField: null },
    newLine: () => ({}),
    calcTotal: (h) => ({ total: 0, h }),
    printTitle: "BUKTI PENGELUARAN BAHAN",
  },
  {
    jnl: "BHP",
    title: "Penerimaan Hasil Produksi",
    short: "Hasil Produksi",
    group: "Produksi & Persediaan",
    sub: "pekerja",
    subLabel: "Pekerja",
    subRequired: true,
    header: [
      { path: "nomor", label: "No. Hasil Produksi", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "sub", label: "Pekerja", type: "sub", span: 2 },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "inv", label: "Barang Jadi", type: "inv", width: "min-w-[260px]" },
      { path: "tka", label: "Pekerja", type: "pekerja", width: "w-44" },
      { path: "d.tk", label: "Jenis", type: "select", options: [{ value: "P", label: "Partai" }, { value: "E", label: "Eceran" }], width: "w-24" },
      { path: "d.ukuran", label: "Ukuran", type: "text", width: "w-32" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "d.ongkos", label: "Ongkos/Pcs", type: "number", width: "w-28" },
      { path: "d.ongkos1", label: "Premi/Pcs", type: "number", width: "w-24" },
      { path: "val", label: "Upah", type: "number", width: "w-36", readOnly: true },
    ],
    ctx: { priceField: null },
    newLine: () => ({ d: { tk: "P" } }),
    calcLine: (l) => ({ ...l, val: round2(n(l.qty) * (n(l.d.ongkos) + n(l.d.ongkos1))) }),
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => n(l.val)), h }),
    printTitle: "BUKTI HASIL PRODUKSI",
  },
  {
    jnl: "KOR",
    title: "Jurnal Koreksi Persediaan",
    short: "Koreksi Persediaan",
    group: "Produksi & Persediaan",
    sub: null,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      LOC,
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "inv", label: "Barang", type: "inv", width: "min-w-[260px]" },
      { path: "dk", label: "+/-", type: "select", options: [{ value: "+", label: "+ Tambah" }, { value: "-", label: "- Kurang" }], width: "w-28" },
      { path: "qty", label: "Qty", type: "number", width: "w-28" },
      { path: "unit", label: "Sat", type: "text", width: "w-16" },
      { path: "val", label: "Nilai", type: "number", width: "w-36" },
      { path: "rem", label: "Keterangan", type: "text", width: "w-44" },
    ],
    ctx: { priceField: null },
    newLine: () => ({ dk: "+" }),
    calcTotal: (h, lines) => ({ total: sum(lines, (l) => (l.dk === "-" ? -n(l.val) : n(l.val))), h }),
    printTitle: "KOREKSI PERSEDIAAN",
  },
  voucher("KM", "Jurnal Kas Masuk", "Kas Masuk", "cus", "BUKTI KAS MASUK"),
  voucher("KK", "Jurnal Kas Keluar", "Kas Keluar", "sup", "BUKTI KAS KELUAR"),
  voucher("BM", "Jurnal Bank Masuk", "Bank Masuk", "cus", "BUKTI BANK MASUK"),
  voucher("BK", "Jurnal Bank Keluar", "Bank Keluar", "sup", "BUKTI BANK KELUAR"),
  {
    jnl: "JNL",
    title: "Jurnal Umum & Memorial",
    short: "Jurnal Umum",
    group: "Kas / Bank",
    sub: null,
    header: [
      { path: "nomor", label: "Nomor", type: "text", placeholder: "otomatis" },
      { path: "tanggal", label: "Tanggal", type: "date" },
      { path: "h.subname", label: "Nama", type: "text", span: 2 },
      { path: "rem", label: "Keterangan", type: "text", span: 2 },
    ],
    cols: [
      { path: "acc", label: "Akun", type: "acc", width: "w-44" },
      { path: "rem", label: "Keterangan", type: "text", width: "min-w-[260px]" },
      { path: "dk", label: "D/K", type: "select", options: DK_OPTS, width: "w-16" },
      { path: "val", label: "Jumlah", type: "number", width: "w-36" },
    ],
    ctx: { priceField: null },
    newLine: () => ({ dk: "D" }),
    calcTotal: voucherTotal,
    balanced: true,
    printTitle: "JURNAL MEMORIAL",
  },
];

export const DOC_BY_JNL: Record<string, DocConfig> = Object.fromEntries(DOCS.map((d) => [d.jnl, d]));

export function getPath(obj: Record<string, unknown>, path: string): unknown {
  if (path.startsWith("h.")) return (obj.h as Record<string, unknown> | undefined)?.[path.slice(2)];
  if (path.startsWith("d.")) return (obj.d as Record<string, unknown> | undefined)?.[path.slice(2)];
  return obj[path];
}

export function setPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  if (path.startsWith("h.") || path.startsWith("d.")) {
    const bag = path[0] as "h" | "d";
    return { ...obj, [bag]: { ...((obj[bag] as Record<string, unknown>) ?? {}), [path.slice(2)]: value } };
  }
  return { ...obj, [path]: value };
}

export function emptyLine(cfg: DocConfig): DocLine {
  const base: DocLine = { acc: "", gol: "", inv: "", invname: "", qty: 0, unit: "", price: 0, val: 0, dk: "", nota: "", jnlno: "", tka: "", rem: "", d: {} };
  const extra = cfg.newLine();
  return { ...base, ...extra, d: { ...(extra.d ?? {}) } };
}
