"use client";

import { useState } from "react";
import { Lock, ShieldCheck, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Transaction } from "@/lib/types";

function rupiah(val: number): string {
  return "Rp" + (val || 0).toLocaleString("id-ID");
}

export default function PublicInvoiceClient({ id }: { id: string }) {
  const [last4, setLast4] = useState("");
  const [invoice, setInvoice] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{4}$/.test(last4)) {
      setError("Masukkan 4 angka terakhir nomor HP Anda.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("get_public_invoice", {
      p_id: id,
      p_last4: last4,
    });
    setLoading(false);

    if (rpcError) {
      setError("Terjadi kesalahan. Coba lagi.");
      return;
    }
    const row = (data as Transaction[] | null)?.[0];
    if (!row) {
      setError("Nomor tidak cocok atau faktur tidak ditemukan.");
      return;
    }
    setInvoice(row);
  }

  /* ── LOCKED: ask for the last 4 phone digits ── */
  if (!invoice) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{
          background: "linear-gradient(135deg, #021d47 0%, #0b2255 100%)",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: "rgba(2,29,71,0.07)", color: "#021d47" }}
            >
              <Lock size={20} />
            </div>
            <h1
              className="text-xl font-bold"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              Faktur Terkunci
            </h1>
            <p className="text-sm text-gray-500 mt-1.5">
              Untuk membuka, masukkan <strong>4 angka terakhir</strong> nomor HP
              yang tercatat pada faktur ini.
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              value={last4}
              onChange={(e) => {
                setLast4(e.target.value.replace(/\D/g, "").slice(0, 4));
                setError("");
              }}
              inputMode="numeric"
              autoFocus
              placeholder="••••"
              className="w-full text-center tracking-[0.5em] text-2xl font-semibold border border-gray-200 rounded-lg px-3 py-3 text-gray-800 focus:outline-none focus:border-[#021d47] transition-colors"
              maxLength={4}
            />

            {error && <p className="text-red-500 text-xs text-center">⚠ {error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full text-white font-semibold py-3 rounded-lg text-sm tracking-wide transition-opacity disabled:opacity-60"
              style={{ background: "#021d47", cursor: loading ? "default" : "pointer" }}
            >
              {loading ? "Membuka…" : "Buka Faktur"}
            </button>
          </form>

          <p className="flex items-center justify-center gap-1.5 text-[0.7rem] text-gray-400 mt-5">
            <ShieldCheck size={13} /> Ruslie Spring — Faktur aman
          </p>
        </div>
      </div>
    );
  }

  /* ── UNLOCKED: read-only invoice ── */
  const c = invoice.customer;
  return (
    <div
      className="min-h-screen px-4 py-8 sm:py-12 no-print-bg"
      style={{ background: "#f0f4f8", fontFamily: "'DM Sans', sans-serif" }}
    >
      <style>{`
        @media print {
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .invoice-card {
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            margin: 0 auto !important;
            max-width: 100% !important;
          }
          @page { size: A4; margin: 14mm; }
        }
      `}</style>

      <div
        className="invoice-card bg-white max-w-3xl mx-auto rounded-2xl shadow-2xl p-8 sm:p-10 relative overflow-hidden"
        style={{ border: "1px solid rgba(2,29,71,0.08)" }}
      >
        {/* Watermark */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0"
          aria-hidden
        >
          <img
            src="/Logo_Ruslie_Spring.png"
            alt=""
            className="block opacity-40"
            style={{ maxWidth: "60%", maxHeight: "60%", width: "auto", height: "auto" }}
          />
        </div>

        {/* Header */}
        <div className="relative z-10 flex justify-between items-start mb-10 flex-wrap gap-6">
          <div>
            <h2
              className="text-[2.5rem] font-extrabold tracking-tight"
              style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}
            >
              INVOICE
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              <span className="font-semibold text-gray-800">Ruslie Spring</span>
              <br />
              Jl. Sikatan 45, Tandes, Surabaya
              <br />
              +62 851 0481 5151
            </p>
          </div>
          <div className="text-right text-sm leading-7 text-gray-600">
            <div>
              <span className="text-gray-400">Date:</span>{" "}
              <span className="text-gray-700">{invoice.invoice_date}</span>
            </div>
            <div>
              <span className="text-gray-400">Invoice No:</span>{" "}
              <span className="font-semibold text-gray-700">{invoice.invoice_number}</span>
            </div>
          </div>
        </div>

        {/* Verified badge */}
        <div
          className="relative z-10 mb-6 flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "rgba(22,163,74,0.08)", border: "1px solid rgba(22,163,74,0.25)" }}
        >
          <div
            className="flex items-center justify-center w-9 h-9 rounded-full shrink-0"
            style={{ background: "#16a34a", color: "#fff" }}
          >
            <ShieldCheck size={18} />
          </div>
          <div className="leading-tight">
            <p className="text-[0.8rem] font-bold" style={{ color: "#15803d" }}>
              Dokumen Terverifikasi · Tanda Tangan Digital
            </p>
            <p className="text-[0.7rem] text-gray-600">
              Faktur asli dari <span className="font-semibold">Ruslie Spring</span>, tergabung
              dalam satu jaringan terverifikasi.
            </p>
          </div>
        </div>

        {/* Bill to */}
        <div
          className="relative z-10 mb-8 rounded-xl p-5"
          style={{ background: "rgba(191,219,254,0.35)", border: "1px solid rgba(2,29,71,0.12)" }}
        >
          <p className="font-semibold text-[#021d47] text-sm mb-2">Bill To:</p>
          <p className="text-sm text-gray-800 font-medium">{c.name}</p>
          {c.address && <p className="text-sm text-gray-700">{c.address}</p>}
          {c.city && <p className="text-sm text-gray-700">{c.city}</p>}
          {c.phone && <p className="text-sm text-gray-700">No Telp: {c.phone}</p>}
        </div>

        {/* Items */}
        <div className="relative z-10 mb-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr style={{ background: "#021d47", color: "#fff" }}>
                <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-left w-8">#</th>
                <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-left">Item</th>
                <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-right">Qty</th>
                <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-right">Unit Price</th>
                <th className="p-2.5 font-semibold text-xs tracking-wider uppercase border border-[#031a3d] text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-gray-400 italic">
                    Tidak ada item.
                  </td>
                </tr>
              ) : (
                invoice.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td className="border border-gray-200 p-2.5 text-gray-500">{i + 1}</td>
                    <td className="border border-gray-200 p-2.5 text-gray-800 font-medium">{item.name}</td>
                    <td className="border border-gray-200 p-2.5 text-right text-gray-700">{item.qty}</td>
                    <td className="border border-gray-200 p-2.5 text-right text-gray-700">{rupiah(item.price)}</td>
                    <td className="border border-gray-200 p-2.5 text-right font-semibold text-[#021d47]">
                      {rupiah(item.qty * item.price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="relative z-10 text-right text-sm text-gray-700">
          <div className="inline-block min-w-[260px] text-left">
            <div className="flex justify-between py-1.5">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-medium text-gray-800">{rupiah(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-gray-100">
              <span className="text-gray-500">Shipping</span>
              <span className="font-medium text-gray-800">{rupiah(invoice.shipping)}</span>
            </div>
            <div className="flex justify-between items-center pt-3 pb-1">
              <span className="font-bold text-base" style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}>
                TOTAL
              </span>
              <span className="font-extrabold text-[1.25rem]" style={{ color: "#021d47", fontFamily: "'Playfair Display', serif" }}>
                {rupiah(invoice.total)}
              </span>
            </div>
            {invoice.payment_method === "top" && invoice.top_note && (
              <p className="text-xs text-gray-500 mt-2">Pembayaran: {invoice.top_note}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400 space-y-1">
          <p>Terima kasih atas kepercayaan Anda!</p>
          <p>
            Pembayaran via BCA — <strong className="text-gray-600">8620134075</strong> — Albertus Marco Penolla Ruslie
          </p>
        </div>

        {/* Print action */}
        <div className="no-print relative z-10 mt-8 flex justify-center">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
            style={{ background: "#021d47", cursor: "pointer" }}
          >
            <Printer size={15} /> Cetak / Simpan PDF
          </button>
        </div>
      </div>
    </div>
  );
}
