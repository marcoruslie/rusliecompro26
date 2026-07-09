# Scroll Stage Slideshow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the marketing page into a full-screen scrub-and-snap slideshow: each section fills the viewport, scrolling scrubs its internal animation 0→100%, and at 100% the next input snaps to the next section — with native scroll fallback on mobile and `prefers-reduced-motion`.

**Architecture:** A `ScrollStageProvider` owns mode detection, the active index, a per-section progress `MotionValue` registry, and `goTo`. A `ScrollStage` engine captures wheel/touch/keyboard input on desktop, drives the active section's progress through a spring, and runs page-turn snap transitions. Sections read their progress through one hook (`useSectionScrub`) and don't branch on mode. Tall sections (`pan`) translate their content through the viewport as progress advances; short sections (`reveal`) map progress to entrance keyframes. On mobile / reduced-motion the engine is inert and sections render in normal document flow.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Framer Motion, Tailwind CSS. No test suite exists — every task is gated by `npm run build` + `npm run lint` and an explicit **manual verification** checkpoint (run `npm run dev`, observe in browser).

---

## Conventions for every task

- **Build gate:** `npm run build` must complete with no type errors. `npm run lint` must pass.
- **Manual gate:** where stated, run `npm run dev`, open `http://localhost:3000`, and confirm the described behavior in a desktop browser (and resize narrow / toggle OS reduced-motion where noted).
- **Commit** at the end of each task with the given message.
- **Do not change** any copy, translations, `/calculator`, or `/invoice`.
- Preserve every existing visual: tasks swap the *driver* of an animation, never its look.

## File structure

| File | Responsibility | Status |
|------|----------------|--------|
| `lib/scrollStage.tsx` | Provider, context, `useScrollStage`, `useSectionScrub`, `usePanY` helper, `SECTION_ORDER`/types | Create |
| `components/ScrollStage.tsx` | Input-capture engine, snap transitions, fixed progress indicator, native fallback render | Create |
| `app/page.tsx` | Compose provider + sections config + stage | Modify |
| `components/Hero.tsx` … `Footer.tsx` | Swap drivers to `useSectionScrub` | Modify (one task each) |
| `components/Navbar.tsx` | Wire anchor links to `goTo` | Modify |

`SECTION_ORDER` (single source of truth for ids + modes), used by provider, engine, navbar:

```
hero (reveal) · about (reveal) · process (pan) · products (pan) ·
capabilities (reveal) · gallery (pan) · contact (reveal) · footer (reveal)
```

> `process` is `pan` because its existing markup is already a tall (`STEPS.length * 90vh`) sticky-scrub block; in stage mode we feed it a 0→1 progress instead and let it pan/scrub internally (Task 5 details the adaptation).

---

## Task 1: Scroll-stage context, hook, and helpers

**Files:**
- Create: `lib/scrollStage.tsx`

- [ ] **Step 1: Create the provider, context, hook, and helpers**

Create `lib/scrollStage.tsx` with the full content below.

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  motionValue,
  useScroll,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";

export type SectionMode = "reveal" | "pan";

export type SectionDef = {
  id: string;
  mode: SectionMode;
  node: ReactNode;
};

type StageContextValue = {
  /** True only on desktop with motion allowed; false during SSR/first paint. */
  stageEnabled: boolean;
  sections: SectionDef[];
  activeIndex: number;
  /** Animated jump to a section by index (engine sets this up). */
  goTo: (index: number) => void;
  /** Stable progress MotionValue (0..1) for a section id. */
  getProgress: (id: string) => MotionValue<number>;
  /** Engine registers its goTo implementation here. */
  registerGoTo: (fn: (index: number) => void) => void;
  setActiveIndex: (index: number) => void;
};

const StageContext = createContext<StageContextValue | null>(null);

const SCRUB_OFFSET = ["start end", "end start"] as const;

export function ScrollStageProvider({
  sections,
  children,
}: {
  sections: SectionDef[];
  children: ReactNode;
}) {
  // One stable MotionValue per section id, created once.
  const registry = useRef<Map<string, MotionValue<number>>>(new Map());
  if (registry.current.size === 0) {
    for (const s of sections) registry.current.set(s.id, motionValue(0));
  }

  const [stageEnabled, setStageEnabled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const goToRef = useRef<(index: number) => void>(() => {});

  // Enable only on wide viewports with motion allowed. Re-check on resize.
  useEffect(() => {
    const mqWide = window.matchMedia("(min-width: 1024px)");
    const mqMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compute = () => setStageEnabled(mqWide.matches && !mqMotion.matches);
    compute();
    mqWide.addEventListener("change", compute);
    mqMotion.addEventListener("change", compute);
    return () => {
      mqWide.removeEventListener("change", compute);
      mqMotion.removeEventListener("change", compute);
    };
  }, []);

  const value = useMemo<StageContextValue>(
    () => ({
      stageEnabled,
      sections,
      activeIndex,
      goTo: (i: number) => goToRef.current(i),
      getProgress: (id: string) => {
        let mv = registry.current.get(id);
        if (!mv) {
          mv = motionValue(0);
          registry.current.set(id, mv);
        }
        return mv;
      },
      registerGoTo: (fn) => {
        goToRef.current = fn;
      },
      setActiveIndex,
    }),
    [stageEnabled, sections, activeIndex]
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useScrollStage(): StageContextValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useScrollStage must be used within ScrollStageProvider");
  return ctx;
}

/**
 * Returns the 0..1 progress a section should bind its animation to.
 * Stage mode → the engine-driven registry value.
 * Native/reduced-motion mode → the section's own scroll progress.
 * Both hooks always run (rules of hooks); we just choose which to return.
 */
export function useSectionScrub(
  id: string,
  ref: RefObject<HTMLElement>
): MotionValue<number> {
  const { stageEnabled, getProgress } = useScrollStage();
  const staged = getProgress(id);
  const { scrollYProgress } = useScroll({ target: ref, offset: SCRUB_OFFSET as never });
  return stageEnabled ? staged : scrollYProgress;
}

/**
 * For `pan` sections: translate tall content up through the pinned viewport as
 * progress goes 0→1. Returns a MotionValue<number> (pixels, negative) to apply
 * as `style={{ y }}`. Inert (stays 0) when the stage is disabled — native scroll
 * handles tall content in that mode.
 */
export function usePanY(
  progress: MotionValue<number>,
  contentRef: RefObject<HTMLElement>,
  enabled: boolean
): MotionValue<number> {
  const y = useRef(motionValue(0)).current;
  const maxShift = useRef(0);

  useEffect(() => {
    if (!enabled || !contentRef.current) {
      y.set(0);
      return;
    }
    const el = contentRef.current;
    const measure = () => {
      maxShift.current = Math.max(0, el.scrollHeight - window.innerHeight);
      y.set(-progress.get() * maxShift.current);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [enabled, contentRef, progress, y]);

  useMotionValueEvent(progress, "change", (v) => {
    if (enabled) y.set(-v * maxShift.current);
  });

  return y;
}
```

- [ ] **Step 2: Build gate**

Run: `npm run build`
Expected: Compiles with no type errors. (`lib/scrollStage.tsx` is not yet imported anywhere, so this only checks it type-checks.)

- [ ] **Step 3: Commit**

```bash
git add lib/scrollStage.tsx
git commit -m "Add scroll-stage context, scrub hook, and pan helper"
```

---

## Task 2: The ScrollStage engine

**Files:**
- Create: `components/ScrollStage.tsx`

- [ ] **Step 1: Create the engine component**

Create `components/ScrollStage.tsx` with the full content below.

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useSpring,
} from "framer-motion";
import { useScrollStage } from "@/lib/scrollStage";

// Wheel/touch pixels required to scrub a section start→end.
const SCRUB_SENSITIVITY = 1100;
// Keyboard step per Arrow/Space press.
const KEY_STEP = 0.18;
// Lock window (ms) after a snap so one gesture can't skip sections.
const SNAP_LOCK_MS = 760;

export default function ScrollStage() {
  const { stageEnabled, sections } = useScrollStage();

  // --- Native / reduced-motion fallback: plain document flow. ---
  if (!stageEnabled) {
    return (
      <>
        {sections.map((s) => (
          <div key={s.id} data-section={s.id}>
            {s.node}
          </div>
        ))}
      </>
    );
  }
  return <StageEngine />;

  // StageEngine is declared below; it is only rendered when enabled so its
  // hooks never run during fallback (component identity differs → safe).
}

function StageEngine() {
  const { sections, activeIndex, setActiveIndex, getProgress, registerGoTo } =
    useScrollStage();

  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;
  const lockedRef = useRef(false);
  const accRef = useRef(0); // accumulated local target 0..1
  const dirRef = useRef<1 | -1>(1); // last travel direction (for enter transition)

  // Smoothed local progress; feeds the active section's registry value.
  const local = useSpring(0, { stiffness: 90, damping: 22, restDelta: 0.0005 });

  useMotionValueEvent(local, "change", (v) => {
    getProgress(sections[indexRef.current].id).set(v);
  });

  const settleLocal = useCallback(
    (target: number) => {
      accRef.current = target;
      local.set(target);
    },
    [local]
  );

  const snap = useCallback(
    (dir: 1 | -1) => {
      const next = indexRef.current + dir;
      if (next < 0 || next > sections.length - 1) return;
      lockedRef.current = true;
      dirRef.current = dir;
      // Entering forward → start at 0; entering backward → start at end (1).
      const entry = dir === 1 ? 0 : 1;
      accRef.current = entry;
      setActiveIndex(next);
      // Set the incoming section's progress immediately so it renders correctly.
      getProgress(sections[next].id).set(entry);
      local.jump(entry);
      window.setTimeout(() => {
        lockedRef.current = false;
      }, SNAP_LOCK_MS);
    },
    [sections, setActiveIndex, getProgress, local]
  );

  const advance = useCallback(
    (deltaFrac: number) => {
      if (lockedRef.current) return;
      const dir: 1 | -1 = deltaFrac > 0 ? 1 : -1;
      const acc = accRef.current;
      if (dir === 1 && acc >= 0.999) return snap(1);
      if (dir === -1 && acc <= 0.001) return snap(-1);
      settleLocal(Math.min(1, Math.max(0, acc + deltaFrac)));
    },
    [snap, settleLocal]
  );

  // Wheel
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      advance(e.deltaY / SCRUB_SENSITIVITY);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [advance]);

  // Touch
  useEffect(() => {
    let lastY = 0;
    const onStart = (e: TouchEvent) => {
      lastY = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      const y = e.touches[0].clientY;
      advance((lastY - y) / (SCRUB_SENSITIVITY * 0.5));
      lastY = y;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
    };
  }, [advance]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fwd = ["ArrowDown", "PageDown", " ", "Spacebar"];
      const back = ["ArrowUp", "PageUp"];
      if (fwd.includes(e.key)) {
        e.preventDefault();
        advance(KEY_STEP);
      } else if (back.includes(e.key)) {
        e.preventDefault();
        advance(-KEY_STEP);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  // goTo for navbar: jump several sections with a single transition.
  useEffect(() => {
    registerGoTo((target: number) => {
      const clamped = Math.min(sections.length - 1, Math.max(0, target));
      if (clamped === indexRef.current) return;
      lockedRef.current = true;
      dirRef.current = clamped > indexRef.current ? 1 : -1;
      accRef.current = 0;
      setActiveIndex(clamped);
      getProgress(sections[clamped].id).set(0);
      local.jump(0);
      window.setTimeout(() => {
        lockedRef.current = false;
      }, SNAP_LOCK_MS);
    });
  }, [registerGoTo, sections, setActiveIndex, getProgress, local]);

  const active = sections[activeIndex];
  const enterFrom = dirRef.current === 1 ? "100vh" : "-100vh";
  const exitTo = dirRef.current === 1 ? "-100vh" : "100vh";

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={active.id}
          initial={{ y: enterFrom, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: exitTo, opacity: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 overflow-hidden"
        >
          {active.node}
        </motion.div>
      </AnimatePresence>

      <StageIndicator local={local} />
    </div>
  );
}

function StageIndicator({
  local,
}: {
  local: ReturnType<typeof useSpring>;
}) {
  const { sections, activeIndex, goTo } = useScrollStage();
  return (
    <div className="pointer-events-none fixed right-6 top-1/2 z-50 -translate-y-1/2 flex flex-col items-center gap-3">
      {sections.map((s, i) => (
        <button
          key={s.id}
          onClick={() => goTo(i)}
          aria-label={`Go to ${s.id}`}
          className={`pointer-events-auto h-2 w-2 rounded-full transition-all duration-300 ${
            i === activeIndex
              ? "scale-125 bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.9)]"
              : "bg-white/20 hover:bg-cyan/60"
          }`}
        />
      ))}
      <motion.div
        aria-hidden
        className="mt-2 w-px bg-cyan/70 shadow-[0_0_8px_rgba(34,211,238,0.8)]"
        style={{ height: 36, scaleY: local, originY: 0 }}
      />
    </div>
  );
}
```

- [ ] **Step 2: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass. (Engine still not mounted; this checks types and lint only.)

- [ ] **Step 3: Commit**

```bash
git add components/ScrollStage.tsx
git commit -m "Add ScrollStage input-capture engine and indicator"
```

---

## Task 3: Wire the stage into the page (sections still self-scroll)

This task mounts the provider and engine but leaves sections on their existing drivers, so the **native fallback path renders the site exactly as today**, and the stage path renders sections pinned (animations not yet bound — that comes in Tasks 4–11). This isolates "does the engine mount and snap" from "do sections scrub".

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx` with the provider + sections config**

```tsx
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Process from "@/components/Process";
import Products from "@/components/Products";
import Gallery from "@/components/Gallery";
import Capabilities from "@/components/Capabilities";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/lib/i18n";
import { ScrollStageProvider, type SectionDef } from "@/lib/scrollStage";
import ScrollStage from "@/components/ScrollStage";

const SECTIONS: SectionDef[] = [
  { id: "hero", mode: "reveal", node: <Hero /> },
  { id: "about", mode: "reveal", node: <About /> },
  { id: "process", mode: "pan", node: <Process /> },
  { id: "products", mode: "pan", node: <Products /> },
  { id: "capabilities", mode: "reveal", node: <Capabilities /> },
  { id: "gallery", mode: "pan", node: <Gallery /> },
  { id: "contact", mode: "reveal", node: <Contact /> },
  { id: "footer", mode: "reveal", node: <Footer /> },
];

export default function Home() {
  return (
    <LanguageProvider>
      <ScrollStageProvider sections={SECTIONS}>
        <main className="hud-root">
          <Navbar />
          <ScrollStage />
        </main>
      </ScrollStageProvider>
    </LanguageProvider>
  );
}
```

- [ ] **Step 2: Add `hero` and `footer` ids to those sections**

`components/Hero.tsx` — add an `id` to the root `<section>` (line 40-43 area):

```tsx
    <section
      id="hero"
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden bg-graphite"
    >
```

`components/Footer.tsx` — add an `id` to the `<footer>` (line 8):

```tsx
    <footer id="footer" className="relative bg-graphite border-t border-white/[0.06] overflow-hidden">
```

- [ ] **Step 3: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 4: Manual verification — desktop stage mounts & snaps**

Run `npm run dev`, open in a **desktop** browser ≥1024px wide:
- The first screen (Hero) fills the viewport; page does not free-scroll.
- Wheel down ~once past a section snaps to the next section with a vertical slide+fade; wheel up reverses. One gesture never skips two sections.
- Right-edge dot indicator highlights the active section; clicking a dot jumps to it.
- (Sections won't scrub internally yet — that's expected. `pan` sections may show only their top portion; acceptable for now.)

Then resize the window **below 1024px**: the site reverts to normal vertical scrolling with all existing animations. Toggle OS "reduce motion" on at ≥1024px and reload: also normal scrolling.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/Hero.tsx components/Footer.tsx
git commit -m "Mount ScrollStage in page with section config"
```

---

## Task 4: Bind Hero to section progress (reveal)

Hero currently parallaxes off `useScroll({ offset: ["start start","end start"] })`. Swap that driver for `useSectionScrub("hero", ref)` so the same parallax/opacity plays as the section scrubs 0→1. Visuals unchanged.

**Files:**
- Modify: `components/Hero.tsx`

- [ ] **Step 1: Swap the driver**

Replace the import and the scroll setup. Change the framer-motion import line (line 4-9) to drop `useScroll` and keep the rest:

```tsx
import {
  motion,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { useSectionScrub } from "@/lib/scrollStage";
```

Replace the hook block (lines 29-37) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useSectionScrub("hero", ref);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const springY = useTransform(scrollYProgress, [0, 1], [0, 130]);
```

(`HeroSpring` already takes `progress={scrollYProgress}` on line 175 — leave it; it now receives the section scrub value.)

- [ ] **Step 2: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 3: Manual verification**

`npm run dev`, desktop: scroll within Hero — headline/content drift up and fade, the spring animates, then it snaps to About. Resize <1024px: Hero parallax still works on native scroll.

- [ ] **Step 4: Commit**

```bash
git add components/Hero.tsx
git commit -m "Bind Hero parallax to section scrub progress"
```

---

## Task 5: Adapt Process to section progress (pan)

Process already builds its own tall sticky-scrub. In stage mode the section is pinned by the engine, so its internal `useScroll` (offset `start start`/`end end`) no longer advances. Swap it to `useSectionScrub("process", ref)` so the existing step logic, spring, and rail are driven by the engine's 0→1; in native mode the same hook returns the section's own scroll progress.

**Files:**
- Modify: `components/Process.tsx`

- [ ] **Step 1: Swap the driver, keep all downstream logic**

Change the framer-motion import (lines 4-11) to drop `useScroll`:

```tsx
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import { useSectionScrub } from "@/lib/scrollStage";
```

Replace the hook block (lines 34-39) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const scrollYProgress = useSectionScrub("process", ref);
```

Everything downstream (`useMotionValueEvent(scrollYProgress, …)`, `smooth`, `railWidth`) is unchanged and now reads the swapped value.

- [ ] **Step 2: Make the section height mode-aware**

The `height: STEPS.length * 90vh` + inner `sticky top-0 h-screen` is correct for **native** mode. In **stage** mode the section is already pinned to the viewport, so it must be exactly `h-screen` (no tall spacer). Read `stageEnabled` and branch the outer height.

Add to the imports near the top:

```tsx
import { useScrollStage } from "@/lib/scrollStage";
```

In the component body, after `const scrollYProgress = ...`:

```tsx
  const { stageEnabled } = useScrollStage();
```

Change the `<section>` style (line 66) to:

```tsx
      style={{ height: stageEnabled ? "100vh" : `${STEPS.length * 90}vh` }}
```

And change the inner wrapper class (line 68) so it doesn't double-pin in stage mode:

```tsx
      <div className={`${stageEnabled ? "" : "sticky top-0"} h-screen overflow-hidden flex flex-col`}>
```

- [ ] **Step 3: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 4: Manual verification**

`npm run dev`, desktop: scrolling through Process advances the 4 steps (01→04), the spring compresses, the bottom rail fills, then snaps to Products. Resize <1024px: Process still scrubs over its tall native scroll as before.

- [ ] **Step 5: Commit**

```bash
git add components/Process.tsx
git commit -m "Drive Process steps from section scrub progress"
```

---

## Task 6: Bind About to section progress (reveal)

About uses one-shot `useInView` reveals. Map them to scrub progress so the heading → paragraphs → stats → feature cards reveal as you scrub. Keep the `inView` fallback for native mode.

**Files:**
- Modify: `components/About.tsx`

- [ ] **Step 1: Add a progress-driven reveal flag**

Change imports (lines 3-12):

```tsx
import { useRef } from "react";
import { motion, useInView, useTransform, useMotionValueEvent } from "framer-motion";
import { useState } from "react";
import { Factory, MapPin, Cog, ShieldCheck } from "lucide-react";
import {
  ScanReveal,
  SectionIndex,
  CornerBrackets,
  Counter,
} from "./hud";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";
```

Replace the hook block (lines 30-31) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const nativeInView = useInView(ref, { once: true, margin: "-100px" });
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("about", ref);
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.12) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;
```

The existing `animate={inView ? … : {}}` blocks (stats, feature cards) now trigger from scrub. `ScanReveal` keeps its own internal `useInView` — acceptable; it reveals on enter in both modes.

- [ ] **Step 2: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 3: Manual verification**

`npm run dev`, desktop: snapping into About reveals heading, then stats and feature cards animate in as you begin scrubbing; then snap to Process. Resize <1024px: About reveals on scroll as before.

- [ ] **Step 4: Commit**

```bash
git add components/About.tsx
git commit -m "Bind About reveals to section scrub progress"
```

---

## Task 7: Bind Products to section progress (pan)

Products is a multi-card grid taller than one screen → `pan`. In stage mode, pan the grid through the viewport with `usePanY`, and trigger the card reveals from scrub. The per-card `useInView`/parallax inside `ProductCard` stays for native mode.

**Files:**
- Modify: `components/Products.tsx`

- [ ] **Step 1: Wrap the section content for panning and add a scrub reveal flag**

Change imports (lines 3-14, 27-28) to add the stage hooks and `useState`/event:

```tsx
import { useRef, useState } from "react";
import {
  motion,
  useInView,
  useScroll,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  useMotionValueEvent,
  type MotionProps,
} from "framer-motion";
```

and below the existing `./hud` import add:

```tsx
import { useSectionScrub, usePanY, useScrollStage } from "@/lib/scrollStage";
```

In `Products()` replace the hook block (lines 245-251) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("products", ref);
  const panY = usePanY(progress, contentRef, stageEnabled);
  const nativeInView = useInView(ref, { once: true, margin: "-80px" });
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.08) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;
  const headerY = useTransform(progress, [0, 1], [60, -60]);
```

- [ ] **Step 2: Apply the pan transform to the inner content**

Wrap the inner `max-w-7xl` container with the pan transform. Change line 259 from:

```tsx
      <div className="relative z-10 max-w-7xl mx-auto">
```

to:

```tsx
      <motion.div ref={contentRef} style={{ y: panY }} className="relative z-10 max-w-7xl mx-auto">
```

and its matching closing `</div>` (line 279) to `</motion.div>`.

> `ProductCard` reveals via its own internal `useInView`. In stage mode, as `usePanY` scrolls cards into the viewport, those `useInView` triggers fire naturally — no change needed inside `ProductCard`.

- [ ] **Step 3: Make the section a single screen in stage mode**

Change the `<section>` className (line 254-257) to cap height when staged:

```tsx
    <section
      id="products"
      ref={ref}
      className={`relative bg-carbon px-6 lg:px-10 overflow-hidden border-t border-white/[0.06] ${
        stageEnabled ? "h-screen py-20" : "py-[120px]"
      }`}
    >
```

- [ ] **Step 4: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 5: Manual verification**

`npm run dev`, desktop: scrubbing Products pans the card grid up through the viewport while cards reveal with their mechanical entrances; reaching the end snaps to Capabilities. Resize <1024px: Products scrolls and reveals normally.

- [ ] **Step 6: Commit**

```bash
git add components/Products.tsx
git commit -m "Pan Products grid on section scrub progress"
```

---

## Task 8: Bind Capabilities to section progress (reveal)

Capabilities fits a screen → `reveal`. Swap header parallax + reveal trigger to scrub.

**Files:**
- Modify: `components/Capabilities.tsx`

- [ ] **Step 1: Swap the driver**

Change imports (lines 3-6):

```tsx
import { useRef, useState } from "react";
import { motion, useInView, useTransform, useMotionValueEvent } from "framer-motion";
import { SectionIndex, TiltSpotlightCard, type CardEntrance } from "./hud";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";
```

Replace the hook block (lines 71-77) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("capabilities", ref);
  const nativeInView = useInView(ref, { once: true, margin: "-80px" });
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.1) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;
  const headerY = useTransform(progress, [0, 1], [60, -60]);
```

- [ ] **Step 2: Cap height in stage mode**

Change the `<section>` className (lines 80-83):

```tsx
    <section
      id="capabilities"
      ref={ref}
      className={`relative bg-graphite px-6 lg:px-10 border-t border-white/[0.06] overflow-hidden ${
        stageEnabled ? "h-screen flex items-center py-20" : "py-[120px]"
      }`}
    >
```

> The `TiltSpotlightCard` reveals via its own `useInView`; in stage mode the cards are in view when the section is active, so they animate on snap-in. The readout bars use `whileInView` — also fine.

- [ ] **Step 3: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 4: Manual verification**

`npm run dev`, desktop: snapping into Capabilities animates the four instrument cards and industry chips; scrubbing nudges the header; then snaps to Gallery. Resize <1024px: normal behavior.

- [ ] **Step 5: Commit**

```bash
git add components/Capabilities.tsx
git commit -m "Bind Capabilities reveals to section scrub progress"
```

---

## Task 9: Bind Gallery to section progress (pan)

Gallery is the tallest section (15 tiles + video deck) → `pan`. Pan its inner content through the viewport. The lightbox is `position: fixed` and must keep working; leave it outside the panned wrapper.

**Files:**
- Modify: `components/Gallery.tsx`

- [ ] **Step 1: Add stage hooks**

Change imports (lines 3-15) to add stage hooks (note this file uses tabs — match them):

```tsx
import { useRef, useState } from "react"
import {
	motion,
	useInView,
	useScroll,
	useTransform,
	useReducedMotion,
	AnimatePresence,
} from "framer-motion"
import { X, ZoomIn, Play, ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { SectionIndex } from "./hud"
import { useLanguage } from "@/lib/i18n"
import { useSectionScrub, usePanY, useScrollStage } from "@/lib/scrollStage"
```

In `Gallery()` add, right after `const ref = useRef<HTMLElement>(null)` (line 178):

```tsx
	const contentRef = useRef<HTMLDivElement>(null)
	const { stageEnabled } = useScrollStage()
	const progress = useSectionScrub("gallery", ref)
	const panY = usePanY(progress, contentRef, stageEnabled)
```

- [ ] **Step 2: Cap height in stage mode and pan the content**

Change the `<section>` (lines 183-186):

```tsx
		<section
			id="gallery"
			ref={ref}
			className={`relative bg-carbon px-6 lg:px-10 border-t border-white/[0.06] overflow-hidden ${
				stageEnabled ? "h-screen py-20" : "py-[120px]"
			}`}>
```

Change the inner container (line 187) from `<div className="max-w-7xl mx-auto">` to:

```tsx
			<motion.div ref={contentRef} style={{ y: panY }} className="max-w-7xl mx-auto">
```

and change its matching closing `</div>` (line 337, the one immediately before the `{/* ── Lightbox ── */}` comment) to `</motion.div>`.

> The lightbox `AnimatePresence` block (lines 340-389) stays exactly where it is — it is a sibling of the panned content inside the `<section>`, rendered `fixed`, so it is unaffected by the pan transform.

- [ ] **Step 3: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 4: Manual verification**

`npm run dev`, desktop: scrubbing Gallery pans the photo grid and then the video deck up through the viewport, tiles revealing as they enter; clicking a tile still opens the lightbox centered; closing returns to the panned position; end snaps to Contact. Resize <1024px: Gallery scrolls normally; lightbox works.

- [ ] **Step 5: Commit**

```bash
git add components/Gallery.tsx
git commit -m "Pan Gallery content on section scrub progress"
```

---

## Task 10: Bind Contact to section progress (reveal)

Contact fits a screen → `reveal`. Trigger its single reveal block from scrub; keep the rotating rings (idle loops) untouched.

**Files:**
- Modify: `components/Contact.tsx`

- [ ] **Step 1: Swap the driver**

Change imports (lines 3-7):

```tsx
import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion, useMotionValueEvent } from "framer-motion";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { SectionIndex } from "./hud";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";
```

Replace the hook block (lines 17-20) with:

```tsx
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("contact", ref);
  const nativeInView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [sent, setSent] = useState(false);
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.1) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;
```

- [ ] **Step 2: Cap height in stage mode**

Change the `<section>` (lines 23-26):

```tsx
    <section
      id="contact"
      ref={ref}
      className={`relative px-6 lg:px-10 overflow-hidden bg-graphite border-t border-white/[0.06] ${
        stageEnabled ? "h-screen flex items-center py-20" : "py-[120px]"
      }`}
    >
```

- [ ] **Step 3: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 4: Manual verification**

`npm run dev`, desktop: snapping into Contact reveals the heading/form; the form input + submit still work (typing, clicking Send shows the sent state); rings rotate; snap to Footer. Resize <1024px: normal.

- [ ] **Step 5: Commit**

```bash
git add components/Contact.tsx
git commit -m "Bind Contact reveal to section scrub progress"
```

---

## Task 11: Footer as its own slide (reveal)

Footer is short. As its own slide it should sit centered; add a stage-mode height/centering branch. No scrub animation needed beyond presence.

**Files:**
- Modify: `components/Footer.tsx`

- [ ] **Step 1: Make Footer fill the slide in stage mode**

Replace the file body with:

```tsx
"use client";

import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";

export default function Footer() {
  const { t } = useLanguage();
  const { stageEnabled } = useScrollStage();
  return (
    <footer
      id="footer"
      className={`relative bg-graphite border-t border-white/[0.06] overflow-hidden ${
        stageEnabled ? "h-screen flex items-center justify-center" : ""
      }`}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-16 hud-blueprint pointer-events-none"
        style={{ opacity: 0.4 }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap w-full">
        <span className="font-tech text-hud-silver/45 text-[0.88rem]">
          © 2026{" "}
          <span className="text-cyan">Ruslie Spring</span>. {t.footer.rights}
        </span>
        <span className="font-mono text-hud-mute text-[0.66rem] tracking-[0.22em] uppercase">
          {t.footer.tagline}
        </span>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 3: Manual verification**

`npm run dev`, desktop: the last slide is the Footer, vertically centered; scrolling up returns to Contact; scrolling down at Footer does nothing (no section beyond). Resize <1024px: Footer is a normal strip at the bottom.

- [ ] **Step 4: Commit**

```bash
git add components/Footer.tsx
git commit -m "Render Footer as its own centered slide in stage mode"
```

---

## Task 12: Wire Navbar links to `goTo`

Navbar anchor links currently rely on `#hash` + `scroll-behavior: smooth`. In stage mode they must call `goTo(index)`; in native mode they keep hash behavior.

**Files:**
- Modify: `components/Navbar.tsx`

- [ ] **Step 1: Map hrefs to section indices and intercept clicks**

Change imports (lines 3-8) to add the stage hook:

```tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { useScrollStage } from "@/lib/scrollStage";
```

In `Navbar()`, after `const { t } = useLanguage();` (line 20), add:

```tsx
  const { stageEnabled, sections, goTo } = useScrollStage();
  const indexOf = (href: string) =>
    sections.findIndex((s) => `#${s.id}` === href);
  const onNavClick = (href: string) => (e: React.MouseEvent) => {
    if (!stageEnabled) return; // native hash scroll
    const i = indexOf(href);
    if (i >= 0) {
      e.preventDefault();
      goTo(i);
    }
  };
```

Add `onClick={onNavClick(link.href)}` to the desktop nav `<a>` (line 64-68 block) and to the "Get Quote" `<a href="#contact">` (line 77-82). For the mobile menu links (lines 116-124) add to the existing `onClick`:

```tsx
                  onClick={(e) => {
                    onNavClick(link.href)(e);
                    setMenuOpen(false);
                  }}
```

and the mobile Get-Quote button (lines 126-132):

```tsx
                onClick={(e) => {
                  onNavClick("#contact")(e);
                  setMenuOpen(false);
                }}
```

> The top progress hairline (`scaleX: progress` from `useScroll()`) reflects window scroll. In stage mode the window doesn't scroll, so it stays near 0 — acceptable; the right-edge dot indicator (Task 2) is the stage's progress affordance. Leave the hairline as-is.

- [ ] **Step 2: Build + lint gate**

Run: `npm run build && npm run lint`
Expected: Both pass.

- [ ] **Step 3: Manual verification**

`npm run dev`, desktop: clicking each navbar link (and Get Quote) snaps to the right section. Resize <1024px: links scroll via hash as before; mobile menu opens, links navigate and close the menu.

- [ ] **Step 4: Commit**

```bash
git add components/Navbar.tsx
git commit -m "Wire Navbar links to ScrollStage goTo"
```

---

## Task 13: Full verification pass & polish

**Files:**
- Modify (only if a defect is found): any of the above.

- [ ] **Step 1: Production build + lint**

Run: `npm run build && npm run lint`
Expected: Both pass with no errors or warnings introduced by this work.

- [ ] **Step 2: Manual verification matrix**

Run `npm run dev`. Confirm each row:

| Scenario | Expected |
|----------|----------|
| Desktop ≥1024px, wheel down through all 8 sections | Each scrubs its animation, then snaps once to the next; no skipped/double snaps |
| Desktop, wheel up | Reverse order, sections enter from above at end-state |
| Desktop, keyboard ↓/↑/Space/PageUp/PageDown | Advances/retreats; never skips on a single press |
| Trackpad fast flick | Locks during the ~0.76s transition; lands on exactly one section |
| `pan` sections (Process, Products, Gallery) | Content pans fully through viewport; nothing clipped at the end |
| Gallery lightbox | Opens centered, closes, returns to panned position |
| Contact form | Typing + Send works inside the pinned slide |
| Navbar links + dots | Jump to correct section |
| Resize to <1024px | Reverts to native scroll with original animations; no fixed-overlay leftovers |
| OS reduce-motion ON at ≥1024px | Native scroll, content static & fully visible |
| Language switch (EN/ID/中文) mid-deck | Active section and index unchanged; copy updates |

- [ ] **Step 3: Fix any defects found, re-run Steps 1–2.**

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add -A
git commit -m "Polish scroll-stage slideshow after full verification"
```

---

## Self-review notes (author)

- **Spec coverage:** scroll model (Tasks 2–3), scrubbed progress (Tasks 4–11 via `useSectionScrub`), mobile native fallback (Task 1 mode detection + Task 2 fallback render), reduced-motion fallback (Task 1 media query), Navbar `goTo` (Task 12), progress indicator (Task 2), SSR safety (`stageEnabled` starts false), language-switch stability (`activeIndex` lives in provider, not language state — verified Task 13). Tall-content sections handled by `pan` mode (`usePanY`) — an addition beyond the spec's section list, consistent with the approved approach.
- **Edge case — last/first section:** `snap()` returns early when `next` is out of range, so scrolling past Footer or before Hero is a no-op.
- **Known follow-up (out of scope):** the navbar top hairline doesn't track stage progress; the right-edge dots are the stage affordance. Revisit only if desired.
