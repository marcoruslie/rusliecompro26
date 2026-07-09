import type { CSSProperties } from "react";
import { ShieldCheck } from "lucide-react";
import type { Transaction } from "@/lib/types";

function rupiah(val: number): string {
  return "Rp" + (val || 0).toLocaleString("id-ID");
}

// Fixed-width, static rendering of the invoice for image capture. Mirrors the
// unlocked card in PublicInvoiceClient but uses the desktop table layout only and
// has no buttons/lock screen, so html-to-image produces a consistent picture.
export default function InvoiceDocument({ invoice }: { invoice: Transaction }) {
  const c = invoice.customer;
  return (
    <div
      style={{
        width: 760,
        background: "#ffffff",
        fontFamily: "var(--font-dm-sans)",
        color: "#374151",
        padding: 40,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
      }}
    >
      {/* Watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          zIndex: 0,
        }}
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/Logo_Ruslie_Spring.png"
          alt=""
          style={{ opacity: 0.4, maxWidth: "60%", maxHeight: "60%", width: "auto", height: "auto" }}
        />
      </div>

      {/* Header */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 36,
          gap: 24,
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              color: "#021d47",
              fontFamily: "var(--font-playfair)",
              margin: 0,
            }}
          >
            INVOICE
          </h2>
          <p style={{ marginTop: 8, fontSize: 14, lineHeight: 1.6, color: "#4b5563" }}>
            <span style={{ fontWeight: 600, color: "#1f2937" }}>Ruslie Spring</span>
            <br />
            Jl. Sikatan 45, Tandes, Surabaya
            <br />
            +62 851 0481 5151
          </p>
        </div>
        <div style={{ textAlign: "right", fontSize: 14, lineHeight: 1.8, color: "#4b5563" }}>
          <div>
            <span style={{ color: "#9ca3af" }}>Date:</span>{" "}
            <span style={{ color: "#374151" }}>{invoice.invoice_date}</span>
          </div>
          <div>
            <span style={{ color: "#9ca3af" }}>Invoice No:</span>{" "}
            <span style={{ fontWeight: 600, color: "#374151" }}>{invoice.invoice_number}</span>
          </div>
        </div>
      </div>

      {/* Verified badge */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
          borderRadius: 12,
          padding: "12px 16px",
          background: "rgba(22,163,74,0.08)",
          border: "1px solid rgba(22,163,74,0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: "9999px",
            background: "#16a34a",
            color: "#fff",
            flexShrink: 0,
          }}
        >
          <ShieldCheck size={18} />
        </div>
        <div style={{ lineHeight: 1.2 }}>
          <p style={{ fontSize: 12.8, fontWeight: 700, color: "#15803d", margin: 0 }}>
            Dokumen Terverifikasi · Tanda Tangan Digital
          </p>
          <p style={{ fontSize: 11.2, color: "#4b5563", margin: 0 }}>
            Faktur asli dari <span style={{ fontWeight: 600 }}>Ruslie Spring</span>, tergabung dalam
            satu jaringan terverifikasi.
          </p>
        </div>
      </div>

      {/* Bill to */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginBottom: 32,
          borderRadius: 12,
          padding: 20,
          background: "rgba(191,219,254,0.35)",
          border: "1px solid rgba(2,29,71,0.12)",
        }}
      >
        <p style={{ fontWeight: 600, color: "#021d47", fontSize: 14, margin: 0, marginBottom: 8 }}>
          Bill To:
        </p>
        <p style={{ fontSize: 14, color: "#1f2937", fontWeight: 500, margin: 0 }}>{c.name}</p>
        {c.address && <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{c.address}</p>}
        {c.city && <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{c.city}</p>}
        {c.phone && (
          <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>No Telp: {c.phone}</p>
        )}
      </div>

      {/* Items table */}
      <div style={{ position: "relative", zIndex: 10, marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#021d47", color: "#fff" }}>
              <th style={thStyle("left", 32)}>#</th>
              <th style={thStyle("left")}>Item</th>
              <th style={thStyle("right")}>Qty</th>
              <th style={thStyle("right")}>Unit Price</th>
              <th style={thStyle("right")}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ textAlign: "center", padding: "32px 0", color: "#9ca3af", fontStyle: "italic" }}
                >
                  Tidak ada item.
                </td>
              </tr>
            ) : (
              invoice.items.map((item, i) => (
                <tr key={i}>
                  <td style={tdStyle("#6b7280")}>{i + 1}</td>
                  <td style={{ ...tdStyle("#1f2937"), fontWeight: 500 }}>{item.name}</td>
                  <td style={{ ...tdStyle("#374151"), textAlign: "right" }}>{item.qty}</td>
                  <td style={{ ...tdStyle("#374151"), textAlign: "right" }}>{rupiah(item.price)}</td>
                  <td style={{ ...tdStyle("#021d47"), textAlign: "right", fontWeight: 600 }}>
                    {rupiah(item.qty * item.price)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div style={{ position: "relative", zIndex: 10, textAlign: "right", fontSize: 14, color: "#374151" }}>
        <div style={{ display: "inline-block", minWidth: 260, textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <span style={{ color: "#6b7280" }}>Subtotal</span>
            <span style={{ fontWeight: 500, color: "#1f2937" }}>{rupiah(invoice.subtotal)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid #f3f4f6",
            }}
          >
            <span style={{ color: "#6b7280" }}>Shipping</span>
            <span style={{ fontWeight: 500, color: "#1f2937" }}>{rupiah(invoice.shipping)}</span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 12,
              paddingBottom: 4,
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 16, color: "#021d47", fontFamily: "var(--font-playfair)" }}>
              TOTAL
            </span>
            <span style={{ fontWeight: 800, fontSize: 20, color: "#021d47", fontFamily: "var(--font-playfair)" }}>
              {rupiah(invoice.total)}
            </span>
          </div>
          {invoice.payment_method === "top" && invoice.top_note && (
            <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              Pembayaran: {invoice.top_note}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: 48,
          paddingTop: 24,
          borderTop: "1px solid #f3f4f6",
          textAlign: "center",
          fontSize: 12,
          color: "#9ca3af",
        }}
      >
        <p style={{ margin: 0 }}>Terima kasih atas kepercayaan Anda!</p>
        <p style={{ margin: 0, marginTop: 4 }}>
          Pembayaran via BCA — <strong style={{ color: "#4b5563" }}>8620134075</strong> — Albertus
          Marco Penolla Ruslie
        </p>
      </div>
    </div>
  );
}

function thStyle(align: "left" | "right", width?: number): CSSProperties {
  return {
    padding: 10,
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    border: "1px solid #031a3d",
    textAlign: align,
    ...(width ? { width } : {}),
  };
}

function tdStyle(color: string): CSSProperties {
  return { border: "1px solid #e5e7eb", padding: 10, color };
}
