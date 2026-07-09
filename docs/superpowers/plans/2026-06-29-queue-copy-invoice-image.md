# Queue — Copy Invoice as Image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin/editor-only per-row button in the Queue that renders an order's full invoice to a PNG and copies it to the clipboard (with download fallback).

**Architecture:** A new fixed-width presentational component `InvoiceDocument` reproduces the public invoice card. `QueueClient` mounts it off-screen for the selected order, captures it with `html-to-image`, and writes the PNG to the clipboard — mirroring the existing off-screen Print pattern.

**Tech Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, lucide-react, `html-to-image` (new dependency).

## Global Constraints

- **No git in this repo.** Never run any git command (not even status/diff). The user commits manually. The plan contains no commit steps.
- **No test suite.** Verification is `npm run lint`, `npm run build`, and the manual test plan via `npm run dev`.
- **Image is admin/editor only** — gate on `canManagePdf` (`role !== "viewer"`). Viewers receive amounts zeroed server-side and must not see the button.
- **Use plain `<img>`** tags (project convention), not `next/image`.
- **Do not refactor** `PublicInvoiceClient.tsx` or the `/invoice` route.
- Brand navy is `#021d47`; currency format is `"Rp" + n.toLocaleString("id-ID")`.

---

### Task 1: Add the `html-to-image` dependency

**Files:**
- Modify: `package.json` (dependencies)

**Interfaces:**
- Consumes: nothing.
- Produces: the `html-to-image` module, imported later as `import * as htmlToImage from "html-to-image"` exposing `htmlToImage.toBlob(node, options): Promise<Blob | null>`.

- [ ] **Step 1: Install the package**

Run:
```bash
npm install html-to-image
```
Expected: `package.json` gains `"html-to-image"` under `dependencies`; `package-lock.json` updates; no peer-dependency errors.

- [ ] **Step 2: Verify it resolves**

Run:
```bash
node -e "require.resolve('html-to-image'); console.log('ok')"
```
Expected: prints `ok`.

---

### Task 2: Create the `InvoiceDocument` presentational component

**Files:**
- Create: `components/InvoiceDocument.tsx`

**Interfaces:**
- Consumes: `Transaction` from `@/lib/types`.
- Produces: `export default function InvoiceDocument({ invoice }: { invoice: Transaction }): JSX.Element` — a fixed 760px-wide invoice card with no interactive controls.

- [ ] **Step 1: Write the component**

Create `components/InvoiceDocument.tsx`:

```tsx
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
        fontFamily: "'DM Sans', sans-serif",
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
              fontFamily: "'Playfair Display', serif",
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
              <th style={thStyle("left", 8)}>#</th>
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
            <span style={{ fontWeight: 700, fontSize: 16, color: "#021d47", fontFamily: "'Playfair Display', serif" }}>
              TOTAL
            </span>
            <span style={{ fontWeight: 800, fontSize: 20, color: "#021d47", fontFamily: "'Playfair Display', serif" }}>
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

function thStyle(align: "left" | "right", width?: number): React.CSSProperties {
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

function tdStyle(color: string): React.CSSProperties {
  return { border: "1px solid #e5e7eb", padding: 10, color };
}
```

Note: inline styles are used deliberately here (not Tailwind classes) so `html-to-image` captures fully-resolved styles without depending on Tailwind's class processing at capture time.

- [ ] **Step 2: Type-check / lint the new file**

Run:
```bash
npm run lint
```
Expected: no errors for `components/InvoiceDocument.tsx`.

---

### Task 3: Wire the copy button and capture flow into `QueueClient`

**Files:**
- Modify: `components/QueueClient.tsx`

**Interfaces:**
- Consumes: `InvoiceDocument` (Task 2); `htmlToImage.toBlob` (Task 1); existing `canManagePdf`, `orders`, `Transaction`.
- Produces: per-row copy button calling `copyInvoiceImage(o: Transaction): Promise<void>`.

- [ ] **Step 1: Add imports**

In `components/QueueClient.tsx`, add `useRef` to the React import and `Copy` to the lucide import, then add the two module imports.

Change:
```tsx
import { useState, useEffect, Fragment } from "react";
```
to:
```tsx
import { useState, useEffect, useRef, Fragment } from "react";
```

Change the lucide import block to include `Copy`:
```tsx
import {
  Eye,
  Trash2,
  CheckCircle2,
  RotateCcw,
  FileText,
  Link2,
  Unlink,
  ClipboardPaste,
  Printer,
  Copy,
} from "lucide-react";
```

Add after the existing `@/components/AdminNav` import:
```tsx
import * as htmlToImage from "html-to-image";
import InvoiceDocument from "@/components/InvoiceDocument";
```

- [ ] **Step 2: Add state + ref**

Immediately after the `const [printing, setPrinting] = useState(false);` line, add:
```tsx
  // Copy-invoice-as-image: the order currently being captured (off-screen), plus a
  // per-row status message ("Tersalin ✓" / "Terunduh ✓" / error).
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [copyMsg, setCopyMsg] = useState<Record<string, string>>({});
  const invoiceRef = useRef<HTMLDivElement>(null);
```

- [ ] **Step 3: Add the capture/copy function**

Add this function just before `async function toggleStatus(o: Transaction) {`:
```tsx
  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Render the order's invoice off-screen, capture it to a PNG, and copy it to the
  // clipboard. Falls back to a download when clipboard image-write is unavailable.
  async function copyInvoiceImage(o: Transaction) {
    if (!canManagePdf || !o.id || copyingId) return;
    const id = o.id;
    setCopyMsg((p) => ({ ...p, [id]: "" }));
    setCopyingId(id);
    try {
      // Let React mount the off-screen node, then wait for fonts + images.
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r()))
      );
      if (document.fonts?.ready) await document.fonts.ready;
      const node = invoiceRef.current;
      if (!node) throw new Error("no node");
      await Promise.all(
        Array.from(node.querySelectorAll("img")).map((img) =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>((res) => {
                img.onload = () => res();
                img.onerror = () => res();
              })
        )
      );
      const blob = await htmlToImage.toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      if (!blob) throw new Error("no blob");

      const canCopyImage =
        typeof ClipboardItem !== "undefined" &&
        !!navigator.clipboard?.write;
      if (canCopyImage) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          setCopyMsg((p) => ({ ...p, [id]: "Tersalin ✓" }));
        } catch {
          triggerDownload(blob, `invoice-${o.invoice_number}.png`);
          setCopyMsg((p) => ({ ...p, [id]: "Terunduh ✓" }));
        }
      } else {
        triggerDownload(blob, `invoice-${o.invoice_number}.png`);
        setCopyMsg((p) => ({ ...p, [id]: "Terunduh ✓" }));
      }
    } catch {
      setCopyMsg((p) => ({ ...p, [id]: "Gagal menyalin gambar." }));
    } finally {
      setCopyingId(null);
      setTimeout(() => {
        setCopyMsg((p) => {
          if (!p[id]) return p;
          const n = { ...p };
          delete n[id];
          return n;
        });
      }, 2500);
    }
  }
```

- [ ] **Step 4: Add the button in the row action group**

In the action group `<div className="flex items-center gap-3 justify-end">`, immediately after the closing of the paste block (the `{canManagePdf && ( ... )}` block that ends right before the `{/* View PDF in a new tab */}` comment), insert:
```tsx
                        {/* Copy invoice as image (editors only) */}
                        {canManagePdf && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => copyInvoiceImage(o)}
                              disabled={copyingId === o.id}
                              className="text-gray-400 hover:text-[#021d47] transition-colors disabled:opacity-40"
                              title="Salin gambar invoice"
                            >
                              {copyingId === o.id ? (
                                <span className="admin-spinner-xs" />
                              ) : (
                                <Copy size={17} />
                              )}
                            </button>
                            {o.id && copyMsg[o.id] && (
                              <span
                                className="text-xs whitespace-nowrap"
                                style={{
                                  color: copyMsg[o.id].startsWith("Gagal")
                                    ? "#ef4444"
                                    : "#15803d",
                                }}
                              >
                                {copyMsg[o.id]}
                              </span>
                            )}
                          </div>
                        )}
```

- [ ] **Step 5: Mount the off-screen invoice node**

Just before the `{/* Print layout ... */}` comment / the `{printing && (` block near the end of the JSX, add:
```tsx
    {/* Off-screen invoice, mounted only while capturing, used as the html-to-image
        source for "copy invoice as image". Positioned off-screen (not display:none)
        so layout and fonts compute correctly. */}
    {copyingId && (() => {
      const o = orders.find((x) => x.id === copyingId);
      return o ? (
        <div
          style={{ position: "fixed", left: -10000, top: 0, pointerEvents: "none" }}
          aria-hidden
        >
          <div ref={invoiceRef}>
            <InvoiceDocument invoice={o} />
          </div>
        </div>
      ) : null;
    })()}
```

- [ ] **Step 6: Lint**

Run:
```bash
npm run lint
```
Expected: no new errors. (`react-hooks/exhaustive-deps` is unaffected — `copyInvoiceImage` is not a hook dependency.)

- [ ] **Step 7: Production build**

Run:
```bash
npm run build
```
Expected: build succeeds with no type errors.

---

### Task 4: Manual verification

**Files:** none (manual).

- [ ] **Step 1: Run the dev server**

Run:
```bash
npm run dev
```
Expected: server on http://localhost:3000 (or the configured port).

- [ ] **Step 2: Verify the happy path (admin, Chrome/Edge)**

1. Sign in as an admin and open `/admin/queue`.
2. On a processing order that has items, click the new copy (⧉) icon button.
3. Button shows a spinner, then "Tersalin ✓".
4. Paste (Ctrl+V) into WhatsApp Web or an image editor.

Expected: a PNG of the invoice appears, matching `/invoice` content — INVOICE header + company block, date/invoice no., green "Dokumen Terverifikasi" badge, Bill To, items table with Qty/Unit Price/Total, Subtotal/Shipping/TOTAL, watermark logo, and the BCA footer. Text is crisp (2× scale).

- [ ] **Step 3: Verify consistency and the completed tab**

1. Narrow then widen the browser window; copy again. The image looks identical (fixed 760px width).
2. Switch to the Completed tab and copy an order there — same result.

- [ ] **Step 4: Verify the viewer gate**

Sign in as a viewer (or set role to viewer). Expected: the copy button is NOT rendered on any row.

- [ ] **Step 5: Verify the download fallback**

In a browser/context without clipboard image write (or temporarily force the fallback by testing in a non-secure context), click copy. Expected: the PNG downloads as `invoice-<invoice_number>.png` and the button shows "Terunduh ✓".

---

## Self-Review

**Spec coverage:**
- Copy invoice as PNG to clipboard → Task 3 (`copyInvoiceImage`).
- Full official invoice look → Task 2 (`InvoiceDocument` with badge, watermark, footer).
- `html-to-image` dependency → Task 1.
- Admin/editor only → Task 3 button gated on `canManagePdf`; Task 4 Step 4 verifies.
- Off-screen render mirroring Print pattern → Task 3 Step 5.
- Download fallback → Task 3 Step 3; Task 4 Step 5 verifies.
- Independent of Google connection → no `conn` check on the button.
- Manual test plan → Task 4.

**Placeholder scan:** none — all code is concrete.

**Type consistency:** `InvoiceDocument({ invoice }: { invoice: Transaction })` is produced in Task 2 and consumed in Task 3 Step 5. `copyInvoiceImage(o: Transaction)`, `copyingId`, `copyMsg`, and `invoiceRef` are defined and used consistently within Task 3.
