import { runCalculation } from "./springPrice";
import bands from "./quoteBands.json";

export type Material = "steel" | "stainless";

/** Wire type name from Supabase → calculator material (BAJA = steel, SUS304 = stainless). */
export function materialOf(wireTypeName: string): Material | null {
  if (/sus|stainless|inox|\bss\b/i.test(wireTypeName)) return "stainless";
  if (/baja|steel|carbon|piano/i.test(wireTypeName)) return "steel";
  return null;
}

/**
 * Calculator constant for a wire size and order quantity (see quoteBands.json).
 * Slides geometrically from the retail rate at `retailQty` to the bulk rate at
 * `bulkQty`, so there's no price cliff between tiers. Small orders of thin
 * wire carry a surcharge.
 */
export function quoteConstant(wireDiameter: number, quantity: number): number {
  const band = bands.sizeBands.find((b) => b.maxWire === null || wireDiameter < b.maxWire)!;
  const bulk = band.bulk ?? band.retail;

  let k: number;
  if (quantity <= bands.retailQty) k = band.retail;
  else if (quantity >= bands.bulkQty) k = bulk;
  else {
    const t = Math.log(quantity / bands.retailQty) / Math.log(bands.bulkQty / bands.retailQty);
    k = band.retail * Math.pow(bulk / band.retail, t);
  }

  if (quantity < bands.smallOrderQty && wireDiameter < bands.smallOrderMaxWire) {
    k *= bands.smallOrderFactor;
  }
  return k;
}

/**
 * Estimate the per-piece price of a compression spring. Specs use the OUTER
 * diameter ("1.2x10x30" = wire × OD × length) but the calculator takes the
 * inner diameter, so ID = OD − 2 × wire.
 */
export function estimateCompression(spec: {
  wireDiameter: number;
  outerDiameter: number;
  length: number;
  material: Material;
  quantity: number;
  coils?: number;
}) {
  if (spec.wireDiameter < bands.minWire) return null;
  const innerDiameter = spec.outerDiameter - 2 * spec.wireDiameter;
  if (innerDiameter <= 0) return null;
  const r = runCalculation({
    wireDiameter: String(spec.wireDiameter),
    innerDiameter: String(innerDiameter),
    length: String(spec.length),
    constant: String(quoteConstant(spec.wireDiameter, spec.quantity)),
    pitch: "",
    coils: spec.coils ? String(spec.coils) : "",
  });
  if (!r) return null;
  const pricePerPcs = spec.material === "steel" ? r.priceSteel : r.priceStainless;
  return {
    pricePerPcs,
    total: pricePerPcs * spec.quantity,
    coils: r.resolvedCoils,
    smallOrderSurcharge:
      spec.quantity < bands.smallOrderQty && spec.wireDiameter < bands.smallOrderMaxWire,
  };
}
