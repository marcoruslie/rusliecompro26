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
