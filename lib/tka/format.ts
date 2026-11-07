// Formatting helpers for the TKA module (Indonesian conventions, as the legacy printouts).

const nf2 = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

export function fmtNum(v: number | string | null | undefined, decimals = 2): string {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n)) return "";
  return decimals === 0 ? nf0.format(n) : nf2.format(n);
}

/** Like fmtNum but blank for zero, the way the legacy reports print empty cells. */
export function fmtNumZ(v: number | string | null | undefined, decimals = 2): string {
  return Number(v ?? 0) === 0 ? "" : fmtNum(v, decimals);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
export const NAMA_BULAN = BULAN;

export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Parse a number typed the Indonesian way ("1.250,5") or the plain way ("1250.5"). */
export function parseNum(s: string | number | null | undefined): number {
  if (typeof s === "number") return s;
  if (!s) return 0;
  let t = String(s).trim().replace(/\s/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

const SATUAN = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

function terbilangInt(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${terbilangInt(n - 10)} Belas`;
  if (n < 100) return `${terbilangInt(Math.floor(n / 10))} Puluh ${terbilangInt(n % 10)}`.trim();
  if (n < 200) return `Seratus ${terbilangInt(n - 100)}`.trim();
  if (n < 1000) return `${terbilangInt(Math.floor(n / 100))} Ratus ${terbilangInt(n % 100)}`.trim();
  if (n < 2000) return `Seribu ${terbilangInt(n - 1000)}`.trim();
  if (n < 1e6) return `${terbilangInt(Math.floor(n / 1000))} Ribu ${terbilangInt(n % 1000)}`.trim();
  if (n < 1e9) return `${terbilangInt(Math.floor(n / 1e6))} Juta ${terbilangInt(n % 1e6)}`.trim();
  if (n < 1e12) return `${terbilangInt(Math.floor(n / 1e9))} Milyar ${terbilangInt(n % 1e9)}`.trim();
  return `${terbilangInt(Math.floor(n / 1e12))} Triliun ${terbilangInt(n % 1e12)}`.trim();
}

/** "Enam Juta Delapan Ratus Ribu Rupiah" — as printed on the legacy nota. */
export function terbilang(v: number): string {
  const n = Math.round(Math.abs(v));
  if (n === 0) return "Nol Rupiah";
  return `${v < 0 ? "Minus " : ""}${terbilangInt(n).replace(/\s+/g, " ")} Rupiah`;
}

export function downloadCsv(filename: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => {
    const s = String(v ?? "");
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(esc).join(";")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
