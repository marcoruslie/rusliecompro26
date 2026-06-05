# Language Toggle — Design

**Date:** 2026-06-05
**Status:** Approved

## Goal

Add a language toggle to the public marketing page so visitors can switch the
site copy between **English (`en`)**, **Indonesian (`id`)**, and **Chinese
(`zh`, displayed as 中文)**. Switching is instant (no reload) and the choice is
remembered across visits.

## Scope

**In scope:** the single-page marketing site only — `app/page.tsx` and the
section components it stacks: `Navbar`, `Hero`, `About`, `Process`, `Products`,
`Capabilities`, `Gallery`, `Contact`, `Footer`.

**Out of scope:**
- Calculator (`app/calculator`), Invoice (`app/invoice`), and Admin
  (`app/admin`) pages — left exactly as they are.
- URL-based locale routing / SEO per-language indexing.
- Translating dynamic data (DB-backed invoices, customer records, etc.).

The architecture supports adding more languages later by appending to the
dictionary; no component changes required.

## Approach

Client-side React context + a central translation dictionary, persisted to
`localStorage`. Chosen over URL-routed i18n (overkill for one client-rendered
page) and a full i18n library (heavier than needed).

## Components

### 1. `lib/i18n.ts` — translation core
- `export type Lang = 'en' | 'id' | 'zh'`.
- `export const LANGS: { code: Lang; label: string }[]` — `EN`, `ID`, `中文`.
  Drives the toggle UI and iteration order.
- `export const translations: Record<Lang, Record<string, string>>` — a flat,
  dot-keyed map (e.g. `'hero.tagline'`, `'about.feature.manufacturing.title'`).
  English is the source of truth; `id` and `zh` mirror every English key.
- For repeated/array content (stats, feature cards, product items, process
  steps), key each field individually (e.g. `'about.stats.0.label'`) or expose
  small per-language arrays, so existing `.map()` rendering keeps working.

### 2. `components/LanguageProvider.tsx` (`"use client"`)
- React context exposing `{ lang, setLang, t }`.
- On mount, reads `localStorage('rs-lang')`; defaults to `en` when absent or
  invalid. Writes back whenever `lang` changes.
- SSR-safe: no `window` access until after mount. First paint renders `en`,
  then hydrates to the saved choice — avoids hydration mismatch warnings.
- `t(key)` returns
  `translations[lang][key] ?? translations.en[key] ?? key`
  so a missing translation falls back to English (never blank).
- `useLanguage()` hook for consumers.

### 3. `app/page.tsx` — wiring
- Wrap the marketing component stack in `<LanguageProvider>`. Because only this
  page is wrapped, all other routes are unaffected.

### 4. `components/Navbar.tsx` — the toggle UI
- Desktop: a three-pill segmented control (`EN · ID · 中文`) placed next to the
  "Get Quote" button. Active language uses the cyan accent; inactive pills are
  muted, matching the existing nav styling.
- Mobile: the same three pills as a row inside the open menu.

### 5. Marketing component refactor
- Each component calls `useLanguage()` and replaces hardcoded English strings
  with `t(...)` lookups.
- Non-text stays as-is: counter numbers (`20+`, `50K+`), engineering spec
  values (`Ø 0.1 – 50 mm`, `± 0.01 mm`), image paths, hash links, icons.

## Data flow

`localStorage` → `LanguageProvider` (holds `lang`) → context → `useLanguage().t`
in each component → renders the active-language string. `setLang` (from the
navbar pills) updates context + `localStorage`, triggering a re-render of the
whole marketing tree.

## Error / edge handling

- Invalid or absent `localStorage` value → default `en`.
- Missing translation key → English fallback, then the raw key as last resort.
- SSR/hydration → render `en` on the server and first client paint, apply the
  saved language after mount.

## Testing / verification

- `npm run build` passes (no type errors from the typed dictionary).
- Manual: toggling pills instantly re-renders every section in the chosen
  language; the choice survives a full page reload; browser console shows no
  hydration warnings; calculator/invoice/admin pages are visually unchanged.

## Translation quality note

English copy is authoritative. Indonesian and Chinese drafts will be written to
mirror it; a native speaker should proofread `id` and `zh` before launch.
