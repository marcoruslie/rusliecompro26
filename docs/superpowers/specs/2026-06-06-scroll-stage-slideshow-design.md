# Scroll Stage — Full-Screen Scrub-and-Snap Slideshow

**Date:** 2026-06-06
**Status:** Approved (design), pending implementation plan

## Goal

Turn the single-page marketing site (`app/page.tsx`) into a full-screen
slideshow. Each section occupies the viewport; scrolling scrubs that section's
internal animation from 0→100%; when the section's animation completes, the next
scroll input "turns the page" and snaps to the next section. The reference feel
is the existing `Process` section, applied site-wide.

## Decisions (from brainstorming)

- **Scroll model:** Hard snap / scrolljack. The scrollbar is hijacked on desktop;
  sections occupy the full viewport and snap one at a time.
- **Per-section behavior:** Scrubbed progress. Each section has a virtual 0→100%
  timeline driven by scroll; at 100% the next input snaps to the next section.
- **Mobile:** Native scroll. Phones/tablets get normal document scrolling with the
  existing entrance animations — no hijacking.
- **Reduced motion:** Graceful fallback. `prefers-reduced-motion` users get native
  scroll, no scrub/snap, content static and fully visible.

## Approach

**A. Virtual scroll engine** (chosen over CSS scroll-snap and a slideshow library).
A single orchestrator owns the scroll model and feeds every section its progress
through React context, so section components are agnostic to which mode is active.

## Architecture

### 1. `lib/scrollStage.tsx` — context + hook

- `ScrollStageProvider` exposes:
  - `stageEnabled: boolean` — true only on desktop with motion allowed.
  - `activeIndex: number` — current section.
  - `goTo(index: number): void` — animated jump (used by Navbar).
  - A registry mapping each section `id` → its `localProgress` `MotionValue<number>`.
- `useSectionProgress(id: string): MotionValue<number>` returns a 0→1 value:
  - **Stage mode:** the engine's live local progress for that section.
  - **Native / reduced-motion mode:** progress derived from a per-section
    `useScroll({ target, offset: ["start end", "end start"] })`.
- Every section reads its scrub timeline from this one hook, so component code does
  not branch on mode.

### 2. `components/ScrollStage.tsx` — the engine (desktop, motion-on only)

- Pins the stage to the viewport (`position: fixed`, `overflow: hidden`).
- Listens to `wheel`, `touchmove`, and `keydown` (Arrow Up/Down, Space, PageUp/Down).
- Accumulates input into a `useSpring`-smoothed `localProgress` (0→1), with delta
  clamping/debounce to tame trackpad inertia.
- **Snap logic:**
  - At `local === 1` + continued forward input → lock input (~700ms), animate the
    outgoing section out and the incoming section in (slide + fade page-turn),
    `setActiveIndex(i + 1)`, reset `local` to 0.
  - At `local === 0` + continued backward input → snap to previous section, entering
    at `local = 1`.
  - The input lock prevents skipping multiple sections per gesture.
- Renders a fixed progress indicator (section dots + per-section scrub rail) reusing
  the visual language already in `Process.tsx`.

### 3. Section refactor

Each section swaps its bespoke driver (`useScroll` parallax / `useInView` one-shot)
for `useSectionProgress(id)` and maps 0→1 onto its keyframes. **Visuals stay
identical — only the driver changes.**

- **Hero:** headline word-rise → spring/illustration parallax → stat counters.
- **About:** heading scan-reveal → paragraphs → feature-card stagger.
- **Process:** keeps its existing 4-step (`STEP_META`) logic, now fed by local
  progress instead of document `scrollYProgress`.
- **Products / Gallery / Capabilities:** staggered card reveals across the timeline.
- **Contact + Footer:** combined into one final slide.

### 4. Navbar wiring

- Anchor links (`#about`, `#process`, …) call `goTo(index)` when `stageEnabled`,
  giving a smooth animated jump; otherwise they fall back to native `#hash` scroll.
- The existing top progress hairline binds to global progress (active index + local).

### 5. Rollout safety

- Engine gated behind `stageEnabled`; sections always render server-friendly markup.
- Convert **Hero + Process first** as a working proof, verify the feel, then convert
  the remaining sections. The site stays shippable at every step.

## Data flow

```
wheel / touch / key
        │
        ▼
ScrollStage engine ──(useSpring)──► localProgress (0→1)
        │                                  │
        │ snap at 0/1                      │ via context registry
        ▼                                  ▼
   activeIndex ──────────────────►  useSectionProgress(id)
                                           │
                                           ▼
                              section maps 0→1 to keyframes
```

In native/reduced-motion mode the engine is inert: `useSectionProgress` falls back
to per-section `useScroll`, and sections flow normally in the document.

## Components & boundaries

| Unit | Responsibility | Depends on |
|------|----------------|-----------|
| `ScrollStageProvider` | Hold mode flag, active index, progress registry, `goTo` | framer-motion, React context |
| `useSectionProgress` | Give a section its 0→1 `MotionValue` for the active mode | provider, `useScroll` |
| `ScrollStage` | Capture input, drive progress, run snap transitions, render indicator | provider |
| Sections | Map 0→1 progress to existing visuals | `useSectionProgress` |
| `Navbar` | Trigger `goTo` / fallback hash nav | provider |

## Error handling & edge cases

- **SSR:** Engine is client-only; provider defaults to `stageEnabled = false` until
  mounted, so the first paint is the native layout (no hydration mismatch).
- **Resize / breakpoint change:** Recompute `stageEnabled` on resize; switching
  between modes resets to the current section's start.
- **Language switch:** `LanguageProvider` re-render must not reset `activeIndex`
  (keep stage state above or independent of language state).
- **Trackpad inertia:** Clamp/debounce wheel deltas; the input lock during snap
  prevents multi-section skips.
- **Deep links / hash on load:** If a `#hash` is present, initialize `activeIndex`
  to that section.

## Testing

No automated test suite exists in this repo. Verification is manual:
- Desktop: scrub each section to completion, confirm clean single-step snaps both
  directions; keyboard nav; navbar `goTo`; no skipped sections on fast trackpad.
- Mobile/responsive: native scroll, no hijack, entrance animations intact.
- Reduced motion (OS setting): native scroll, content static and fully visible.
- `npm run build` and `npm run lint` clean.

## Out of scope (YAGNI)

- No changes to `/calculator` or `/invoice` tool pages.
- No new section content or copy.
- No slideshow library dependency.
