# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Next.js dev server on http://localhost:3000
npm run build    # Production build
npm start        # Serve the production build
npm run lint     # next lint (eslint-config-next)
```

There is no test suite in this repo.

## Architecture

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Framer Motion + lucide-react. The site is a single-page company profile for Ruslie Spring, plus two standalone tool pages.

### Routes

- `app/page.tsx` — single-page marketing site composed by stacking section components from `components/` (`Navbar`, `Hero`, `About`, `Products`, `Gallery`, `Capabilities`, `Contact`, `Footer`). All in-page nav uses `#section-id` hash links.
- `app/calculator/page.tsx` — server component that renders `CalculatorClient` (spring weight + IDR price estimator, Indonesian-language UI).
- `app/invoice/page.tsx` — server component that renders `InvoiceClient` (printable invoice generator, Indonesian-language UI).

The marketing nav (`components/Navbar.tsx`) does not currently link to `/calculator` or `/invoice` — those tool links exist but are commented out. They are reachable only via direct URL.

### Component conventions

- Section components under `components/` are client components (`"use client"`) because they all use Framer Motion / hooks for scroll, parallax, and interaction.
- `app/layout.tsx` is intentionally minimal: only `globals.css`, metadata, and `<body>`. The body's dark navy background is set in `globals.css`, so any page that needs a light background (e.g. the calculator) sets its own background on the outermost wrapper.
- Path alias `@/*` maps to the project root (see `tsconfig.json`), used as `@/components/...`.

### Styling

- Tailwind config (`tailwind.config.ts`) defines the brand palette as named colors: `navy` (default `#021d47`), `silver`, `steel`, plus `bg-dot-white` / `bg-dot-navy` radial-dot backgrounds used for section textures.
- Fonts (`Playfair Display` for `font-display`, `DM Sans` for `font-body`) are loaded via `@import` in `app/globals.css` and exposed as CSS variables `--font-playfair` / `--font-dm-sans`. Do not re-import Google Fonts in components — `CalculatorClient` currently does this redundantly inside a `useEffect`.
- `globals.css` sets the default `body` background to navy `#021d47` and text to white. Light-themed pages/sections must override this on their own root element.

### Assets

Static assets live in `public/`:
- `public/banner/` — hero banner images (referenced as `/banner/banner2.jpg` etc.)
- `public/spring/` — gallery photos (`gallery1..8.jpg`), product images (`item1..6.jpg`), and machine videos (`Mesin1Vid.mp4`, `Mesin2Vid.mp4`)
- `public/Logo_Ruslie_Spring.png` — logo used in the navbar

Image references in components use plain `<img>` tags, not `next/image`. Match that convention unless converting deliberately.

### Calculator domain logic

`components/CalculatorClient.tsx` contains the spring price formula (`runCalculation`). It is a 1-to-1 port from a prior Vue implementation — preserve the exact math (steel density `7.89`, `pricePerKgSteel = 90`, `pricePerKgStainless = 180`, `Math.ceil` rounding points) when editing, since downstream quotes depend on it. The `pitch` and `coils` inputs are optional and have specific fallback rules (pitch defaults to wire diameter; coils defaults to `ceil(length / (2 * wireDiameter))` when both are blank).

### Admin modules & TKA

After login (`/admin`) users land on `/admin/home`, a chooser between **TKA** (`/admin/tka`) and **Ruslie Spring** (`/admin/dashboard`). Viewers still go straight to the Queue and cannot open TKA.

TKA is a web rebuild of the legacy DOS/Clipper accounting program in `../PRG/PEER` (no source code survived; behaviour was reverse-engineered from its DBF files and verified by re-posting the imported documents).

- Schema & logic: `supabase/migrations/0008_tka.sql`. Documents are generic (`tka_doc` + `tka_doc_line`, legacy fields kept in JSONB `h`/`d`); `tka_post()` turns a document into ledger lines (`tka_jurnal`), stock movements (`tka_mutasi`), invoice register (`tka_hp`/`tka_bayar`) and giro (`tka_giro`). Always save through the `tka_save_doc` RPC so postings stay in sync — never write `tka_doc_line` directly. Balances = yearly opening (`tka_saldo_awal`, `tka_stok_awal`) + postings; `tka_tutup_tahun` writes the next year's openings.
- Costing: HPP and production value use the item's standard cost `tka_inv.hppmin`; imported lines carry the exact legacy cost in `d.hpp_val`/`d.hpp_qty`/`d.hpp` (see `tka_line_cost`).
- Legacy ledger codes: 498 kas masuk, 499 bank masuk, 500 kas keluar, 501 bank keluar; voucher numbers use year/month letters (`KK/\A/0001` = Jan 2025, year letter = chr(65 + year − 1998)).
- UI is config-driven: `lib/tka/docs.ts` (document types → list/form/print), `lib/tka/masters.ts` (master tables), `lib/tka/reports.ts` (reports). Components live in `components/tka/`.
- Import: `npm run tka:import` (add `-- --reset` to wipe and re-import). Only live DBF records are imported; the Clipper program kept edited/deleted versions as deleted rows.
