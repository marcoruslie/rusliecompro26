// Back-calculates the calculator "constant" from past invoices so the AI chat
// can quote with it. Read-only: prints results, changes nothing.
//
//   npm run calibrate:quote
//
// Invoice line names encode specs as "<wire>x<OD>x<length>", e.g. "1.2x10x30".
// No description = compression spring; only those are used (extension/torsion
// springs aren't priced by this formula).
import { createClient } from "@supabase/supabase-js";
import { runCalculation } from "../lib/springPrice.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });

const SPEC = /(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/i;
const NOT_COMPRESSION = /tarik|extension|ext\b|torsi|torsion|putar|zigzag|kait|hook|wire ?form/i;
// A 4th dimension ("0.5x9x3.8x11") means a shape this formula doesn't cover.
const FOUR_DIMS = /\d\s*[x×*]\s*[\d.,]+\s*[x×*]\s*[\d.,]+\s*[x×*]\s*\d/i;
// Below this wire size springs sell at a minimum price, not by weight.
const MIN_WIRE = 0.6;
const num = (s) => parseFloat(s.replace(",", "."));

// Coil count: "13Lilit", "Lilitan 12", "L24", "15L", "7L". Part codes in
// parentheses like "(51471127L)" are stripped first.
function coilsOf(name) {
  const t = name.replace(/\([^)]*\)/g, " ");
  const m =
    t.match(/lilit(?:an)?\s*(\d+(?:[.,]\d+)?)/i) ||
    t.match(/(?<![\d.,])(\d+(?:[.,]\d+)?)\s*l(?:ilit(?:an)?)?\b/i) ||
    t.match(/\bl\s*(\d+)\b/i);
  return m ? m[1].replace(",", ".") : "";
}

function pitchOf(name) {
  const m = name.match(/pitch\s*(\d+(?:[.,]\d+)?)/i);
  return m ? m[1].replace(",", ".") : "";
}

function materialOf(text) {
  if (/sus|stainless|inox|\bss\b/i.test(text)) return "stainless";
  if (/baja|steel|carbon|piano/i.test(text)) return "steel";
  return null;
}

const [{ data: types, error: e1 }, { data: wires, error: e2 }, { data: txs, error: e3 }] =
  await Promise.all([
    supabase.from("wire_types").select("type_id,name"),
    supabase.from("wires").select("wire_id,name,type_id"),
    supabase.from("transactions").select("invoice_number,items"),
  ]);
if (e1 || e2 || e3) throw e1 || e2 || e3;

const typeName = new Map(types.map((t) => [t.type_id, t.name]));
const wireMaterial = new Map(
  wires.map((w) => [w.wire_id, materialOf(typeName.get(w.type_id) ?? "") ?? materialOf(w.name)]),
);

const samples = { steel: [], stainless: [] };
const skipped = { noSpec: 0, notCompression: 0, tinyWire: 0, noMaterial: 0, noPrice: 0, badCalc: 0 };
const tiny = [];
let lines = 0;

for (const tx of txs) {
  for (const item of tx.items ?? []) {
    lines++;
    const name = String(item.name ?? "");
    const m = name.match(SPEC);
    if (!m) { skipped.noSpec++; continue; }
    if (NOT_COMPRESSION.test(name) || FOUR_DIMS.test(name)) { skipped.notCompression++; continue; }
    // The name is what was actually sold; the linked wire is the fallback.
    const material = materialOf(name) || (item.wire_id && wireMaterial.get(item.wire_id));
    if (!material) { skipped.noMaterial++; continue; }
    if (!(item.price > 0)) { skipped.noPrice++; continue; }

    const [wd, od, len] = [num(m[1]), num(m[2]), num(m[3])];
    if (wd < MIN_WIRE) {
      skipped.tinyWire++;
      tiny.push({ name, price: item.price, qty: item.qty, inv: tx.invoice_number });
      continue;
    }
    const coils = coilsOf(name);
    const r = runCalculation({
      wireDiameter: String(wd),
      innerDiameter: String(od - 2 * wd),
      length: String(len),
      constant: "1",
      pitch: pitchOf(name),
      coils,
    });
    if (!r) { skipped.badCalc++; continue; }
    const perKg = material === "steel" ? 90 : 180;
    samples[material].push({
      k: item.price / (r.weight * perKg),
      coils: coils || `~${r.resolvedCoils}`,
      name,
      price: item.price,
      qty: item.qty,
      wd,
      inv: tx.invoice_number,
    });
  }
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];
const fmt = (n) => n.toFixed(2);

console.log(`Invoice lines scanned: ${lines}`);
console.log("Skipped:", skipped);
for (const mat of ["steel", "stainless"]) {
  const ks = samples[mat].map((s) => s.k);
  console.log(`\n== ${mat} (${ks.length} lines) ==`);
  if (!ks.length) continue;
  console.log(`median ${fmt(median(ks))}   p25 ${fmt(q(ks, 0.25))}   p75 ${fmt(q(ks, 0.75))}   min ${fmt(Math.min(...ks))}   max ${fmt(Math.max(...ks))}`);
  for (const s of samples[mat].sort((a, b) => a.k - b.k))
    console.log(`  k=${fmt(s.k).padStart(8)}  Rp${String(s.price).padStart(8)}  qty ${String(s.qty).padStart(5)}  coils ${String(s.coils).padStart(4)}  ${s.name}  (${s.inv})`);
}
if (tiny.length) {
  console.log(`\n== wire < ${MIN_WIRE} mm (${tiny.length} lines; minimum price, not by weight) ==`);
  for (const t of tiny) console.log(`  Rp${String(t.price).padStart(8)}  qty ${String(t.qty).padStart(5)}  ${t.name}  (${t.inv})`);
}
// ── Size × quantity bands ──
// Steel and stainless are pooled: the formula already prices stainless at 2×,
// and their implied constants overlap.
const SIZE_BANDS = [
  { key: "small", label: "wire < 2 mm", max: 2 },
  { key: "medium", label: "wire 2–5 mm", max: 5 },
  { key: "large", label: "wire ≥ 5 mm", max: Infinity },
];
const BULK_QTY = 100;
const sizeOf = (wd) => SIZE_BANDS.find((b) => wd < b.max).key;
const tierOf = (qty) => (qty >= BULK_QTY ? "bulk" : "retail");

const pooled = [...samples.steel, ...samples.stainless];
const bands = {};
for (const b of SIZE_BANDS) {
  const retail = pooled.filter((s) => sizeOf(s.wd) === b.key && tierOf(s.qty) === "retail").map((s) => s.k);
  const bulk = pooled.filter((s) => sizeOf(s.wd) === b.key && tierOf(s.qty) === "bulk").map((s) => s.k);
  bands[b.key] = {
    retail: retail.length ? +fmt(median(retail)) : null,
    bulk: bulk.length ? +fmt(median(bulk)) : null,
    n: { retail: retail.length, bulk: bulk.length },
  };
}

if (pooled.length) {
  console.log(`\n== Bands (retail = qty < ${BULK_QTY}, bulk = qty ≥ ${BULK_QTY}) ==`);
  for (const b of SIZE_BANDS) {
    const x = bands[b.key];
    console.log(`  ${b.label.padEnd(12)} retail ${String(x.retail ?? "—").padStart(6)} (n=${x.n.retail})   bulk ${String(x.bulk ?? "—").padStart(6)} (n=${x.n.bulk})`);
  }

  // How far each invoice would be off: estimate/actual = k_used / k_actual.
  const single = median(pooled.map((s) => s.k));
  const errs = { single: [], banded: [] };
  console.log("\n== Fit vs actual invoice price ==");
  for (const s of pooled.sort((a, b) => a.wd - b.wd)) {
    const band = bands[sizeOf(s.wd)];
    const kb = (tierOf(s.qty) === "bulk" ? band.bulk : band.retail) ?? band.retail ?? band.bulk;
    const e1 = single / s.k - 1;
    const e2 = kb / s.k - 1;
    errs.single.push(Math.abs(e1));
    errs.banded.push(Math.abs(e2));
    const pct = (e) => `${e >= 0 ? "+" : ""}${(e * 100).toFixed(0)}%`.padStart(6);
    console.log(`  qty ${String(s.qty).padStart(4)}  Rp${String(s.price).padStart(8)}  single ${pct(e1)}  banded ${pct(e2)}  ${s.name}`);
  }
  console.log(`  median |error|: single ${(median(errs.single) * 100).toFixed(0)}%   banded ${(median(errs.banded) * 100).toFixed(0)}%`);

  console.log("\nSuggested lib/quoteBands.json:");
  console.log(JSON.stringify({ bulkQty: BULK_QTY, sizeBands: SIZE_BANDS.map(({ key, max }) => ({ key, maxWire: max === Infinity ? null : max })), constants: Object.fromEntries(Object.entries(bands).map(([k, v]) => [k, { retail: v.retail, bulk: v.bulk }])) }, null, 2));
}
