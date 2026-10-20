import type { SupabaseClient } from "@supabase/supabase-js";
import type { MarketplaceFeeBreakdown, MarketplaceFeeRates } from "@/lib/types";

// Marketplace customers are matched by name, same as the online-channel default
// in TransactionForm ("Shopee Customer", "SHOPEE - Budi", ...).
export function isShopeeCustomer(name: string | null | undefined): boolean {
  return (name ?? "").toLowerCase().includes("shopee");
}

export async function getShopeeFeeRates(
  supabase: SupabaseClient
): Promise<MarketplaceFeeRates | null> {
  const { data, error } = await supabase
    .from("marketplace_fee_settings")
    .select("admin_fee_pct, ongkir_xtra_pct, promo_xtra_pct, order_fee, pph22_pct")
    .eq("marketplace", "shopee")
    .maybeSingle();
  if (error) throw error;
  return data ? toRates(data) : null;
}

export async function updateShopeeFeeRates(
  supabase: SupabaseClient,
  rates: MarketplaceFeeRates
): Promise<MarketplaceFeeRates> {
  const { data, error } = await supabase
    .from("marketplace_fee_settings")
    .upsert({ marketplace: "shopee", ...rates, updated_at: new Date().toISOString() })
    .select("admin_fee_pct, ongkir_xtra_pct, promo_xtra_pct, order_fee, pph22_pct")
    .single();
  if (error) throw error;
  return toRates(data);
}

// Postgres `numeric` can come back as a string; normalise to numbers.
function toRates(row: Record<string, unknown>): MarketplaceFeeRates {
  return {
    admin_fee_pct: Number(row.admin_fee_pct) || 0,
    ongkir_xtra_pct: Number(row.ongkir_xtra_pct) || 0,
    promo_xtra_pct: Number(row.promo_xtra_pct) || 0,
    order_fee: Number(row.order_fee) || 0,
    pph22_pct: Number(row.pph22_pct) || 0,
  };
}

// Shopee charges every percentage fee on the item price (after seller
// discounts), never on shipping, so the base is the invoice subtotal. Each fee
// is rounded to whole rupiah like Shopee's income statement. Per-quantity caps
// (e.g. Gratis Ongkir XTRA Rp40.000/pcs) are ignored: spring prices sit far below them.
export function computeShopeeFees(
  subtotal: number,
  rates: MarketplaceFeeRates
): MarketplaceFeeBreakdown {
  const pct = (p: number) => Math.round((subtotal * p) / 100);
  const admin_fee = pct(rates.admin_fee_pct);
  const ongkir_xtra = pct(rates.ongkir_xtra_pct);
  const promo_xtra = pct(rates.promo_xtra_pct);
  const order_fee = subtotal > 0 ? Math.round(rates.order_fee) : 0;
  const pph22 = pct(rates.pph22_pct);
  return {
    marketplace: "shopee",
    rates,
    admin_fee,
    ongkir_xtra,
    promo_xtra,
    order_fee,
    pph22,
    total: admin_fee + ongkir_xtra + promo_xtra + order_fee + pph22,
  };
}

export const SHOPEE_FEE_LABELS: {
  key: keyof Omit<MarketplaceFeeBreakdown, "marketplace" | "rates" | "total">;
  rate: keyof MarketplaceFeeRates;
  label: string;
}[] = [
  { key: "admin_fee", rate: "admin_fee_pct", label: "Biaya Administrasi" },
  { key: "ongkir_xtra", rate: "ongkir_xtra_pct", label: "Gratis Ongkir XTRA" },
  { key: "promo_xtra", rate: "promo_xtra_pct", label: "Promo XTRA" },
  { key: "order_fee", rate: "order_fee", label: "Biaya Proses Pesanan" },
  { key: "pph22", rate: "pph22_pct", label: "PPh 22" },
];
