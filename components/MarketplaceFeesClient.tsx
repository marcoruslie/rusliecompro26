"use client";

import { useMemo, useState } from "react";
import { Save, Percent, Check } from "lucide-react";
import AdminNav from "@/components/AdminNav";
import { createClient } from "@/lib/supabase/client";
import {
  updateShopeeFeeRates,
  computeShopeeFees,
  SHOPEE_FEE_LABELS,
} from "@/lib/marketplaceFees";
import type { MarketplaceFeeRates } from "@/lib/types";

function formatCurrency(val: number): string {
  return val.toLocaleString("id-ID", { minimumFractionDigits: 0 });
}

const EMPTY_RATES: MarketplaceFeeRates = {
  admin_fee_pct: 0,
  ongkir_xtra_pct: 0,
  promo_xtra_pct: 0,
  order_fee: 0,
  pph22_pct: 0,
};

const HINTS: Record<keyof MarketplaceFeeRates, string> = {
  admin_fee_pct: "Tergantung kategori produk (2,5%–10%). Cek di Seller Centre.",
  ongkir_xtra_pct: "Isi 0 jika toko tidak ikut program Gratis Ongkir XTRA.",
  promo_xtra_pct: "Isi 0 jika toko tidak ikut program Promo XTRA.",
  order_fee: "Biaya tetap per pesanan selesai (Rp).",
  pph22_pct: "Dipotong Shopee dari omzet. Isi 0 jika toko dibebaskan.",
};

const EXAMPLE_SUBTOTAL = 100000;

export default function MarketplaceFeesClient({
  initialRates,
}: {
  initialRates: MarketplaceFeeRates | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rates, setRates] = useState<MarketplaceFeeRates>(initialRates ?? EMPTY_RATES);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const example = computeShopeeFees(EXAMPLE_SUBTOTAL, rates);

  function setRate(key: keyof MarketplaceFeeRates, val: string) {
    setSaved(false);
    setRates((p) => ({ ...p, [key]: val === "" ? 0 : Number(val) }));
  }

  async function save() {
    setError("");
    if (Object.values(rates).some((v) => !Number.isFinite(v) || v < 0)) {
      setError("Nilai biaya tidak boleh negatif.");
      return;
    }
    setSaving(true);
    try {
      setRates(await updateShopeeFeeRates(supabase, rates));
      setSaved(true);
    } catch {
      setError("Gagal menyimpan biaya Shopee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-shell px-6 pb-10 pt-[92px] lg:pt-10">
      <AdminNav active="marketplace-fees" />
      <div className="admin-content max-w-3xl mx-auto">
        <div className="mb-8 admin-rise">
          <p className="admin-eyebrow">Ruslie Spring Admin</p>
          <h1 className="admin-title text-3xl mt-1">Biaya Shopee</h1>
          <p className="text-sm text-gray-500 mt-2">
            Dipotong otomatis dari transaksi customer Shopee untuk menghitung uang yang diterima
            bersih. Transaksi lama tetap memakai tarif saat disimpan.
          </p>
        </div>

        {error && <p className="admin-error mb-4">⚠ {error}</p>}

        <div className="admin-panel admin-panel-glow admin-rise rounded-2xl p-5 mb-6">
          <p className="admin-panel-heading mb-4 flex items-center gap-2">
            <Percent size={14} /> Tarif
          </p>
          <div className="space-y-4">
            {SHOPEE_FEE_LABELS.map(({ rate, label }) => (
              <div key={rate} className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-1.5 sm:gap-4 sm:items-center">
                <div>
                  <p className="text-sm font-semibold text-[#021d47]">{label}</p>
                  <p className="text-xs text-gray-400">{HINTS[rate]}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  {rate === "order_fee" && <span className="text-sm text-gray-500">Rp</span>}
                  <input
                    type="number"
                    min={0}
                    step={rate === "order_fee" ? 50 : 0.05}
                    value={rates[rate] || ""}
                    onChange={(e) => setRate(rate, e.target.value)}
                    placeholder="0"
                    className="admin-input text-right"
                  />
                  {rate !== "order_fee" && <span className="text-sm text-gray-500">%</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-2 text-white font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-60"
              style={{ background: saved ? "#16a34a" : "#021d47" }}
            >
              {saving ? <span className="admin-btn-spinner" /> : saved ? <Check size={15} /> : <Save size={15} />}
              {saving ? "Menyimpan…" : saved ? "Tersimpan" : "Simpan"}
            </button>
          </div>
        </div>

        {/* Worked example so the effect of the rates is obvious */}
        <div className="admin-panel admin-rise rounded-2xl p-5 text-sm">
          <p className="admin-panel-heading mb-3">
            Contoh: pesanan Rp{formatCurrency(EXAMPLE_SUBTOTAL)}
          </p>
          {SHOPEE_FEE_LABELS.map(({ key, label }) => (
            <div key={key} className="flex justify-between py-0.5 text-gray-600">
              <span>{label}</span>
              <span>−Rp{formatCurrency(example[key])}</span>
            </div>
          ))}
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-200 font-bold text-[#021d47]">
            <span>Diterima Bersih</span>
            <span>Rp{formatCurrency(EXAMPLE_SUBTOTAL - example.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
