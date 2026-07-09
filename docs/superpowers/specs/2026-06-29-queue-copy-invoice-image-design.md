# Queue — Copy Invoice as Image

**Date:** 2026-06-29
**Status:** Approved (pending spec review)

## Goal

Add a per-row button in the admin Queue (`components/QueueClient.tsx`) that renders
that order's invoice as a PNG and copies it to the clipboard, so an admin can paste it
straight into WhatsApp (or any chat) to send the customer their invoice.

## Decisions (from brainstorming)

- **What gets copied:** a PNG **image** of the full invoice (not the uploaded
  attachment, not a link).
- **Image style:** the **full official invoice** look — identical content to the public
  `/invoice/[id]` page: header, "Dokumen Terverifikasi" badge, Bill-To, items table,
  subtotal/shipping/total, watermark logo, and bank-transfer footer.
- **Rendering:** client-side via the **`html-to-image`** npm dependency (approved).
- **Access:** admin/editor only (`canManagePdf`, i.e. `role !== "viewer"`). Viewers have
  monetary values stripped server-side and must not generate invoice images.
- **Independent of Google Drive** connection — this is pure local rendering.

## Why client-side is sufficient

The Queue page already loads every field needed to render a full invoice. For admins,
`Transaction` (see `lib/types.ts`) carries `customer` (name/address/city/phone),
`items` (name/qty/price), `subtotal`, `shipping`, `total`, `payment_method`,
`top_note`, `invoice_date`, and `invoice_number`. No extra fetch is required.

(For viewers, `app/admin/queue/page.tsx` zeroes out all amounts before the payload
reaches the client — another reason the button is admin/editor only.)

## Components

### 1. `components/InvoiceDocument.tsx` (new, presentational)

A fixed-width (~760px) rendering of the invoice card, driven by a `Transaction`.

- Fixed pixel width so the captured image is consistent regardless of screen size.
- Uses the **desktop table layout** only (no responsive/mobile stacked-card variant —
  that variant exists in `PublicInvoiceClient` for small screens and is not wanted in a
  static image).
- Reproduces the visual elements from `PublicInvoiceClient`'s unlocked card:
  header (INVOICE + company block + date/invoice no.), green verified badge, Bill-To
  block, items table, summary (subtotal/shipping/total + optional TOP note), watermark
  logo, and the bank-transfer footer.
- Pure presentational: takes `{ invoice: Transaction }`, no data fetching, no buttons.
- Kept separate from `PublicInvoiceClient` to avoid entangling this with that
  component's lock screen and responsive behavior (no refactor of `PublicInvoiceClient`
  in this scope).

### 2. `components/QueueClient.tsx` (modified)

- **New action button** per row, in the existing right-aligned action group (near
  "Lihat File"), shown only when `canManagePdf`. Icon-style button (e.g. lucide
  `Copy` / `ImageDown`) with a tooltip like "Salin gambar invoice".
- **New state:** `copyingId: string | null` (the order currently being captured) so an
  off-screen `InvoiceDocument` can be mounted just for that order, mirroring the existing
  off-screen Print pattern (`printing` + `queue-print`).
- **Per-row feedback:** reuse the existing inline per-row message pattern
  (`pasteErr`/`showPasteErr`/`clearPasteErr`) for both success ("Tersalin ✓") and error
  states, or an equivalent small inline indicator keyed by order id.

## Flow (on button click)

1. Guard: `canManagePdf` and `o.id` present; ignore if another copy is in progress.
2. `setCopyingId(o.id)` → React mounts the hidden `InvoiceDocument` for that order
   (absolutely positioned off-screen, e.g. `left: -10000px`, real size — not
   `display:none`, so layout/fonts compute).
3. Wait for assets: `await document.fonts.ready` and ensure the watermark logo
   (`/Logo_Ruslie_Spring.png`, same-origin) has loaded.
4. `const blob = await htmlToImage.toBlob(node, { pixelRatio: 2, backgroundColor: "#ffffff" })`
   (2× for a crisp image; white background so transparent areas aren't black in chat).
5. **Copy:** `await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])`.
6. On success → inline "Tersalin ✓"; clear after a short delay.
7. `finally` → `setCopyingId(null)` to unmount the off-screen node.

## Error handling & fallback

- If `navigator.clipboard?.write` / `ClipboardItem` is unavailable, or the write throws
  (e.g. older Safari, permissions), **fall back to downloading** the PNG: create an
  object URL from the blob and trigger an `<a download="invoice-<invoice_number>.png">`
  click. Inline message notes it was downloaded instead of copied.
- If image generation itself fails, show an inline error ("Gagal membuat gambar.").
- Always reset `copyingId` in `finally`.

## Asset / rendering notes

- Fonts: Playfair Display / DM Sans are loaded globally via `@import` in
  `globals.css`; `await document.fonts.ready` before capture ensures they're applied.
- The logo is same-origin, so `html-to-image` can inline it without canvas tainting.
- `html-to-image` is client-only; import it inside the client component (dynamic import
  or top-level import in the `"use client"` file).

## Out of scope

- No server-side image generation.
- No refactor of `PublicInvoiceClient` or the `/invoice` route.
- No change to viewer permissions or amount-stripping.
- No bulk "copy all" — single order per click.

## Manual test plan

(No automated test suite in this repo.)

1. As admin, on a processing order with items, click the copy button → paste into
   WhatsApp Web / an image editor → invoice image appears, matching `/invoice` content
   (prices, total, badge, watermark, footer all present and legible).
2. Image width/scale consistent on a narrow vs wide browser window.
3. Completed-tab order copies the same way.
4. Viewer role: button is not rendered.
5. Fallback: in a browser without clipboard image write, the PNG downloads instead.
