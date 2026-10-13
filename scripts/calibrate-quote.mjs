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
const NOT_COMPRESSION = /tarik|extension|ext\b|torsi|torsion|kait|hook|wire ?form/i;
const num = (s) => parseFloat(s.replace(",", "."));

function materialOf(text) {
  if (/sus|stainless|inox/i.test(text)) return "stainless";
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
const skipped = { noSpec: 0, notCompression: 0, noMaterial: 0, noPrice: 0, badCalc: 0 };
let lines = 0;

for (const tx of txs) {
  for (const item of tx.items ?? []) {
    lines++;
    const name = String(item.name ?? "");
    const m = name.match(SPEC);
    if (!m) { skipped.noSpec++; continue; }
    if (NOT_COMPRESSION.test(name)) { skipped.notCompression++; continue; }
    const material = (item.wire_id && wireMaterial.get(item.wire_id)) || materialOf(name);
    if (!material) { skipped.noMaterial++; continue; }
    if (!(item.price > 0)) { skipped.noPrice++; continue; }

    const [wd, od, len] = [num(m[1]), num(m[2]), num(m[3])];
    const r = runCalculation({
      wireDiameter: String(wd),
      innerDiameter: String(od - 2 * wd),
      length: String(len),
      constant: "1",
      pitch: "",
      coils: "",
    });
    if (!r) { skipped.badCalc++; continue; }
    const perKg = material === "steel" ? 90 : 180;
    samples[material].push({ k: item.price / (r.weight * perKg), name, price: item.price, inv: tx.invoice_number });
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
  for (const s of samples[mat].sort((a, b) => a.k - b.k).slice(0, 5).concat(samples[mat].slice(-5)))
    console.log(`  k=${fmt(s.k).padStart(8)}  Rp${String(s.price).padStart(8)}  ${s.name}  (${s.inv})`);
}
const all = [...samples.steel, ...samples.stainless].map((s) => s.k);
if (all.length) {
  console.log("\nSuggested .env.local:");
  if (samples.steel.length) console.log(`QUOTE_CONSTANT_STEEL=${fmt(median(samples.steel.map((s) => s.k)))}`);
  if (samples.stainless.length) console.log(`QUOTE_CONSTANT_STAINLESS=${fmt(median(samples.stainless.map((s) => s.k)))}`);
  console.log(`QUOTE_CONSTANT=${fmt(median(all))}`);
}
