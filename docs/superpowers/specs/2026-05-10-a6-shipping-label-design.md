# A6 Shipping Label — Design

**Date:** 2026-05-10
**Scope:** Add a printable A6 black-and-white shipping label that reuses invoice data, integrated into the existing `/invoice` page.

## Goal

Let the user print a shipping sticker for a package directly from `/invoice` without re-entering recipient info. The label must be A6 portrait, monochrome (B&W only), and include the Ruslie Spring logo plus sender and recipient blocks.

## Non-goals

- No standalone `/label` route or new page.
- No label data persistence beyond the current invoice form session.
- No barcode, QR code, courier branding, or weight/dimensions field.
- No "Fragile / Handle with Care" notice.
- No label customisation beyond what's already in the invoice form.

## Data sources

All fields come from existing `InvoiceClient` state — no new inputs.

| Label field | Source |
|---|---|
| Sender name, address, phone | Hardcoded in component (`Ruslie Spring`, `Jl. Sikatan 45, Tandes, Surabaya`, `+62 851 0481 5151`) — same strings already used in the invoice header |
| Recipient name | `invoice.customer.name` |
| Recipient address | `invoice.customer.address` |
| Recipient city | `invoice.customer.city` |
| Recipient phone | `invoice.customer.phone` |
| Item summary | Derived from `invoice.items` (see rule below) |
| Logo | `/Logo_Ruslie_Spring.png` (forced monochrome via CSS filter) |

**Item summary rule (derived at render time):**

- 0 items → `Isi: —`
- 1 item → `` Isi: {item.qty} {item.name} `` (e.g., `Isi: 50 Per Spiral 5mm`)
- 2+ items → `` Isi: {totalQty} items — {firstItem.name} dll. ``

`totalQty` is the sum of `qty` across all items.

## Layout (A6 portrait, 105 × 148 mm)

```
┌──────────────────────────────────────┐
│  [LOGO]  RUSLIE SPRING               │  brand strip (~18mm)
│  ─────────────────────────────────── │
│  DARI                                │
│  Ruslie Spring                       │  sender block (~28mm)
│  Jl. Sikatan 45, Tandes, Surabaya    │
│  +62 851 0481 5151                   │
│  ═══════════════════════════════════ │  thick divider (1.5mm)
│                                      │
│  KEPADA                              │
│  PT. KOBEXINDO EQUIPMENT             │  recipient name —
│                                      │  largest text on
│  Jl. Raya Bekasi Karawang KM 58…     │  the label (~22pt
│  Bekasi, Jawa Barat                  │  bold)
│  Telp: 085218282583                  │
│                                      │
│  ─────────────────────────────────── │
│  Isi: 3 items — Per Spiral 5mm dll.  │  footer (~10mm)
└──────────────────────────────────────┘
```

**Visual rules:**

- All ink is `#000`; background is `#fff`. No grays, no brand navy.
- Logo gets `filter: grayscale(1) contrast(1.15)` so it prints clean monochrome regardless of the source PNG.
- The recipient name is the largest, boldest element on the label — the courier should be able to read it at arm's length.
- Section labels (`DARI`, `KEPADA`) use uppercase tracking, smaller than body text, to act as quiet markers rather than headlines.
- Page margin: 6mm. Internal blocks separated by single `border-top: 1px solid #000` rules; the sender↔recipient divider is `border-top: 3px solid #000` for visual weight.
- Font stack: `'DM Sans', sans-serif` for body, `'Playfair Display', serif` for the wordmark (matches the rest of the site).

## Component changes

All edits land in **`components/InvoiceClient.tsx`**. No new files, no new routes.

### 1. Print mode plumbing

Add a third mode alongside the existing `printing-do`:

- New handler `handlePrintLabel()`:
  1. Add `printing-label` class to `<body>`.
  2. Inject a temporary `<style id="label-page-style">@page { size: A6 portrait; margin: 6mm; }</style>` into `<head>`. (Required because `@page` size cannot be conditioned on a body class via plain CSS — we swap the rule at print time.)
  3. Register an `afterprint` listener that removes the body class **and** the injected style element.
  4. `requestAnimationFrame(() => window.print())` so the body class lands before the print dialog opens (same trick the existing `handlePrintDeliveryOrder` uses).

- Existing `@page { size: A4; margin: 14mm; }` rule stays untouched. The injected A6 rule overrides it for the duration of the label print only.

### 2. Print CSS additions

Inside the existing `@media print` block:

```css
body.printing-label .doc-invoice,
body.printing-label .doc-do { display: none !important; }
body.printing-label .doc-label { display: block !important; }
```

And outside `@media print` (so the label stays hidden in the editor view):

```css
.doc-label { display: none; }
```

### 3. New `.doc-label` document

A new `<div className="doc-label label-wrapper">` rendered after the existing `.doc-do` block. It contains the A6 layout described above. Sized in `mm` so it matches the printed output 1:1.

### 4. New "Print Sticker Label" button

A third button in the existing `.print-btn-row`, after `Print Surat Jalan`. Same outline-on-white styling as `Print Surat Jalan` so the three buttons read as a set. Icon: `Printer` from `lucide-react` (already imported).

## Print mechanics — why dynamic style injection

CSS does not allow `@page` size to depend on a body class or media query other than `print`. Three options were considered:

1. **Dynamic `<style>` injection at print time** (chosen). Adds the A6 `@page` rule before `window.print()`, removes it on `afterprint`. Reliable, no user friction.
2. **Static `@page label { size: A6 }` named page + `page: label` selector.** Browser support is uneven and the user would still need a wrapper element with `page: label`, which doesn't help when the rule conflicts with the existing default `@page`.
3. **Ask the user to pick A6 in the print dialog.** Fragile — Indonesian printers default to A4 and the form factor would be wrong.

## File touchpoints

- `components/InvoiceClient.tsx` — add handler, button, hidden label document, print CSS rules.

That's it. No other files change.

## Out of scope / future

- A "save as PDF download" button (currently relies on browser's print → save-as-PDF).
- Multiple labels per A4 sheet (would need a different layout).
- Pulling sender info from a config so it's editable without code changes.
