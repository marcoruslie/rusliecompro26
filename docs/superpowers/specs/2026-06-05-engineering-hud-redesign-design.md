# Ruslie Spring — "Engineering HUD" Redesign

**Date:** 2026-06-05
**Direction:** Engineering HUD (Swiss grid + technical FUI) with cinematic, scroll-driven hero and process section. (UI/UX Pro Max: Swiss Modernism 2.0 + HUD/Sci-Fi FUI + Motion-Driven + Parallax Storytelling.)

## Goal

Bold reinvention of the single-page marketing site for Ruslie Spring (precision spring manufacturer, Indonesia). Reinforce trust for B2B/industrial buyers while delivering distinctive, high-quality Framer Motion animation. Marketing page only — calculator, invoice, and `/admin` are untouched.

## Design tokens

**Palette (graphite/steel base + single electric accent):**
- `graphite` #0A0E14 — page base
- `carbon` #11161F — panels
- `steel-700` #1C2430 — raised surfaces
- `cyan` #22D3EE — primary accent (lines, glows, active states); `cyan-dim` #0E7490
- `silver` #C8D2E0 — primary text; `mute` #6B7689 — secondary text
- hairlines: white @ 8%

Existing `navy`/`silver`/`steel` tokens are **kept** in `tailwind.config.ts` so admin/tools pages don't break. New tokens added alongside.

**Type:**
- Display/headings: **Space Grotesk** (geometric-technical)
- Body: **DM Sans** (already used)
- Technical labels / measurements / data: **JetBrains Mono** (the "HUD voice")
- Loaded via `@import` in `globals.css` + CSS variables, matching existing pattern.

**Signature motifs:** blueprint dot+line grid; monospace measurement annotations (`Ø 0.1–50 mm`, `±0.01 mm`); thin scan-lines that sweep on reveal; corner ticks/brackets framing panels; animated numeric counters.

## Sections (content preserved, rebuilt)

1. **Navbar** — slim, blur-on-scroll, mono nav labels, scroll-progress hairline, magnetic "Get Quote".
2. **Hero (cinematic)** — full-screen graphite + blueprint grid; kinetic split-text headline; SVG spring that draws/coils on entrance and reacts to scroll; floating mono spec annotations; animated trust counters (35+, 50K+, 80+).
3. **About** — Swiss two-column; mono section index (`01 / WHO WE ARE`); scan-line reveals; feature cards with corner ticks. Stats preserved.
4. **Process (NEW)** — scroll-driven 4-step journey: Wire → Coil → Heat-treat → QC, with a progress rail and morphing spring SVG. Showpiece (A+C mix).
5. **Products** — bento grid on carbon panels, cyan hairline borders, hover glow + corner brackets. 6 products preserved.
6. **Capabilities** — instrument-panel spec readout; animated counters; industry tags as mono chips. Data preserved.
7. **Gallery** — keep current functionality (lightbox + video deck), restyled to graphite/cyan. Images/videos preserved.
8. **Contact** — instrument-panel form, cyan focus glows, rotating HUD rings. Info preserved.
9. **Footer** — mono, faint blueprint baseline.

## Animation system

Framer Motion (already installed, v11):
- `useScroll`/`useTransform` for hero parallax + process scroll progression
- `whileInView` staggered reveals (`once: true`)
- magnetic hover (mouse-tracked springs)
- `AnimatePresence` for lightbox

**Reusable primitives** (new, keep section files focused):
`BlueprintGrid`, `ScanReveal`, `MagneticButton`, `Counter`, `SpecTag`, `SectionIndex`.

**Accessibility / performance:**
- honor `prefers-reduced-motion` (disable scan/heavy scroll effects)
- GPU-only transforms (translate/scale/opacity)
- reveals fire once

## Scope / non-goals

- In scope: `app/page.tsx` marketing sections + `components/` (marketing only), `tailwind.config.ts` (additive), `app/globals.css` (fonts + base).
- Out of scope: calculator, invoice, all `/admin`, Supabase, API routes. Do not modify.
- Git: no commits/pushes — user handles all git.
