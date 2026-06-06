"use client";

import {
  createContext,
  useCallback,
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
  type MotionValue,
  type UseScrollOptions,
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
  /** Whole-deck progress (0..1): (activeIndex + localProgress) / sections. Engine-driven. */
  globalProgress: MotionValue<number>;
  /** Engine registers its goTo implementation here. */
  registerGoTo: (fn: (index: number) => void) => void;
  setActiveIndex: (index: number) => void;
};

const StageContext = createContext<StageContextValue | null>(null);

const SCRUB_OFFSET: UseScrollOptions["offset"] = ["start end", "end start"];

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

  // Slideshow disabled — the whole page scrolls natively. Keeping the provider
  // (with stageEnabled permanently false) so sections' useScrollStage/
  // useSectionScrub/usePanY calls resolve to their native-scroll path.
  const [stageEnabled] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const goToRef = useRef<(index: number) => void>(() => {});
  // Whole-deck progress, written by the engine; drives the navbar hairline in stage mode.
  const globalProgress = useRef(motionValue(0)).current;

  // Stable identity so the engine doesn't re-register on every activeIndex change.
  const registerGoTo = useCallback((fn: (index: number) => void) => {
    goToRef.current = fn;
  }, []);
  const getProgress = useCallback((id: string) => {
    let mv = registry.current.get(id);
    if (!mv) {
      mv = motionValue(0);
      registry.current.set(id, mv);
    }
    return mv;
  }, []);

  const value = useMemo<StageContextValue>(
    () => ({
      stageEnabled,
      sections,
      activeIndex,
      goTo: (i: number) => goToRef.current(i),
      getProgress,
      globalProgress,
      registerGoTo,
      setActiveIndex,
    }),
    [stageEnabled, sections, activeIndex, getProgress, globalProgress, registerGoTo]
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
  ref: RefObject<HTMLElement | null>
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
  contentRef: RefObject<HTMLElement | null>,
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
    // Subscribe AFTER the first measure so the handler never runs with a stale
    // maxShift of 0 (which would flick the content to position 0).
    const unsub = progress.on("change", (v) => {
      y.set(-v * maxShift.current);
    });
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      unsub();
    };
  }, [enabled, contentRef, progress, y]);

  return y;
}
