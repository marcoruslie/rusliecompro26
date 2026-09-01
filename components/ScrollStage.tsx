"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  type MotionValue,
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
}

function StageEngine() {
  const { sections, activeIndex, setActiveIndex, getProgress, globalProgress, registerGoTo } =
    useScrollStage();

  const indexRef = useRef(activeIndex);
  indexRef.current = activeIndex;
  const lockedRef = useRef(false);
  const accRef = useRef(0); // accumulated local target 0..1
  const dirRef = useRef<1 | -1>(1); // last travel direction (for enter transition)

  // Displayed scrub value (0..1). Smoothed toward `targetRef` with a per-frame
  // lerp — a convex blend that can never overshoot past 1 or below 0, and resets
  // instantly on a section change (no spring rebound / flash-to-full).
  const display = useMotionValue(0);
  const targetRef = useRef(0);

  useAnimationFrame(() => {
    const cur = display.get();
    const t = targetRef.current;
    if (Math.abs(t - cur) < 0.0006) {
      if (cur !== t) display.set(t);
      return;
    }
    const next = cur + (t - cur) * 0.18; // smoothing factor
    display.set(next);
    getProgress(sections[indexRef.current].id).set(next);
    globalProgress.set((indexRef.current + next) / sections.length);
  });

  // Instantly park progress at 0 — used on every section change.
  const resetProgress = useCallback(() => {
    accRef.current = 0;
    targetRef.current = 0;
    display.jump(0);
    globalProgress.set(indexRef.current / sections.length);
  }, [display, globalProgress, sections.length]);

  const settleLocal = useCallback((value: number) => {
    accRef.current = value;
    targetRef.current = value;
  }, []);

  const snap = useCallback(
    (dir: 1 | -1) => {
      const next = indexRef.current + dir;
      if (next < 0 || next > sections.length - 1) return;
      lockedRef.current = true;
      dirRef.current = dir;
      // Advance the ref before resetProgress() so the `smooth` change handler
      // writes into the incoming section (not the outgoing one); the next render
      // sets it to the same value once setActiveIndex resolves.
      indexRef.current = next;
      setActiveIndex(next);
      // Incoming section always starts its scrub at 0, regardless of direction.
      getProgress(sections[next].id).set(0);
      resetProgress();
      window.setTimeout(() => {
        lockedRef.current = false;
      }, SNAP_LOCK_MS);
    },
    [sections, setActiveIndex, getProgress, resetProgress]
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
      // We own all vertical scrolling while the engine is mounted — swallow the
      // native scroll regardless of lock state (advance() no-ops when locked).
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
      indexRef.current = clamped;
      setActiveIndex(clamped);
      getProgress(sections[clamped].id).set(0);
      resetProgress();
      window.setTimeout(() => {
        lockedRef.current = false;
      }, SNAP_LOCK_MS);
    });
  }, [registerGoTo, sections, setActiveIndex, getProgress, resetProgress]);

  const active = sections[activeIndex];
  // Gentle directional slide + crossfade (not a full-viewport fly-in).
  const enterFrom = dirRef.current === 1 ? 56 : -56;
  const exitTo = dirRef.current === 1 ? -56 : 56;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-ground">
      <AnimatePresence initial={false} mode="sync">
        <motion.div
          key={active.id}
          initial={{ y: enterFrom, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: exitTo, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 overflow-hidden"
        >
          {active.node}
        </motion.div>
      </AnimatePresence>

      <StageIndicator local={display} />
    </div>
  );
}

function StageIndicator({ local }: { local: MotionValue<number> }) {
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
              ? "scale-125 bg-navy"
              : "bg-rule-strong hover:bg-navy/60"
          }`}
        />
      ))}
      <motion.div
        aria-hidden
        className="mt-2 w-px bg-navy/70"
        style={{ height: 36, scaleY: local, originY: 0 }}
      />
    </div>
  );
}
