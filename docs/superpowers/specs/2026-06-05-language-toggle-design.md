# Language Toggle — Design Spec

**Date:** 2026-06-05
**Status:** Approved (design)

## Goal

Let visitors switch the marketing homepage between **English (en)**, **Indonesian (id)**, and **Simplified Chinese (zh)** with a small language selector in the navbar. The chosen language persists across visits.

## Scope

**In scope:** The single-page marketing site only — `Navbar`, `Hero`, `About`, `Process`, `Products`, `Capabilities`, `Gallery`, `Contact`, `Footer`.

**Out of scope:** `/calculator`, `/invoice`, public invoice, and all admin/dashboard pages. These keep their current language.

**Translated content:** all prose, plus product names, capability labels, gallery captions/tags, and industry names. **Not translated:** phone number, email, street address, brand name "Ruslie Spring".

## Approach

Lightweight client-side React Context + a central dictionary. No new dependencies, no routing changes. Chosen over `next-intl` locale routing (overkill for one page) and URL query params (more plumbing, little benefit). Every section component is already `"use client"`, so context consumption is natural.

### Components / Units

**`lib/i18n.tsx`** (client)
- Exports `type Lang = 'en' | 'id' | 'zh'`.
- `LanguageProvider`: holds `lang` state (default `'en'`). On mount, reads `localStorage["lang"]` and applies it if valid. On change, writes `localStorage["lang"]` and sets `document.documentElement.lang`.
- `useLanguage()` hook returns `{ lang, setLang, t }`, where `t = translations[lang]` (the active dictionary).
- What it depends on: `translations` from `lib/translations.ts`.

**`lib/translations.ts`**
- One `translations` object: `{ en: {...}, id: {...}, zh: {...} }`.
- Each language has the same shape, keyed by section: `nav`, `hero`, `about`, `process`, `products`, `capabilities`, `gallery`, `contact`, `footer`.
- The `en` shape is the source of truth; `id` and `zh` mirror its keys. A TypeScript type derived from `en` enforces that `id`/`zh` stay complete.
- Animation-split text (Hero headline, any `<br/>`-split headings) is stored as string arrays so kinetic reveals keep working across languages.

**`components/LanguageSwitcher.tsx`** (client)
- Globe-icon button showing the current language (`EN` / `ID` / `中文`); click opens a 3-item dropdown.
- Calls `setLang` on selection. Used in both the desktop navbar and the mobile menu.

### Changed files

- `app/page.tsx` — wrap the section stack in `<LanguageProvider>`. `page.tsx` stays a server component rendering a client provider with client children (valid in App Router).
- The 9 section components — replace hardcoded English with `t.<section>.<key>` via `useLanguage()`. Lists currently held in module-level `const` arrays (nav links, features, steps, products, caps, industries, gallery items, contact info) move to dictionary-driven data: keep non-text fields (icons, hrefs, image paths, animation variants) in the component, pull text fields from `t`.

## Data flow

`LanguageProvider` (state + localStorage) → `useLanguage()` in each section → render `t` strings. Selecting a language calls `setLang` → re-render + persist.

## Error handling / edge cases

- Invalid or missing `localStorage["lang"]` → fall back to `'en'`.
- SSR renders `'en'`; a returning visitor who picked id/zh sees a brief English flash before the mount effect applies their choice. Accepted tradeoff for a no-dependency approach.
- Icons, hrefs, image `src`, animation variants, and counter numbers stay language-agnostic in the components; only display text is translated.

## Testing

No automated test suite in this repo. Verification is manual: `npm run dev`, confirm the switcher changes all nine sections, the choice survives a reload, animations still play, and `npm run build` succeeds.
