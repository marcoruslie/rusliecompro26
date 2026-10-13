import { runCalculation } from "./springPrice";

export type Material = "steel" | "stainless";

/** Wire type name from Supabase → calculator material (BAJA = steel, SUS304 = stainless). */
export function materialOf(wireTypeName: string): Material | null {
  if (/sus|stainless|inox/i.test(wireTypeName)) return "stainless";
  if (/baja|steel|carbon|piano/i.test(wireTypeName)) return "steel";
  return null;
}

/**
 * Pricing constant per material. Values come from `npm run calibrate:quote`
 * (median of past compression-spring invoices); QUOTE_CONSTANT is the fallback.
 */
export function quoteConstant(material: Material): number | null {
  const raw =
    (material === "steel" ? process.env.QUOTE_CONSTANT_STEEL : process.env.QUOTE_CONSTANT_STAINLESS) ||
    process.env.QUOTE_CONSTANT;
  const n = raw ? parseFloat(raw) : NaN;
  return n > 0 ? n : null;
}

/**
 * Estimate the per-piece price of a compression spring. Invoice names give the
 * OUTER diameter ("1.2x10x30" = wire × OD × length) but the calculator takes the
 * inner diameter, so ID = OD − 2 × wire.
 */
export function estimateCompression(spec: {
  wireDiameter: number;
  outerDiameter: number;
  length: number;
  material: Material;
  constant: number;
}) {
  const innerDiameter = spec.outerDiameter - 2 * spec.wireDiameter;
  if (innerDiameter <= 0) return null;
  const r = runCalculation({
    wireDiameter: String(spec.wireDiameter),
    innerDiameter: String(innerDiameter),
    length: String(spec.length),
    constant: String(spec.constant),
    pitch: "",
    coils: "",
  });
  if (!r) return null;
  return {
    pricePerPcs: spec.material === "steel" ? r.priceSteel : r.priceStainless,
    weightGrams: r.weight,
    coils: r.resolvedCoils,
    innerDiameter,
  };
}
