"use client";

/* ─────────────────────────────────────────────────────────────
   Light-industrial primitives

   Replaces the previous HUD kit. Motion here is scroll-driven and
   deliberate — nothing tracks the cursor, nothing glows. The only
   3D is depth on entry: cards approach from behind the page plane
   and settle flush, which costs one composited transform each.
   All of it honours prefers-reduced-motion.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useRef, useState, type ReactNode, type ElementType } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  animate,
  type MotionProps,
} from "framer-motion";

/* ── Machinist's grid texture ─────────────────────────────── */
export function GridTexture({
  className = "",
  fade = true,
  opacity = 1,
}: {
  className?: string;
  fade?: boolean;
  opacity?: number;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 ind-grid ${className}`}
      style={{
        opacity,
        ...(fade
          ? {
              maskImage:
                "linear-gradient(to bottom, black, transparent 62%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, black, transparent 62%)",
            }
          : {}),
      }}
    />
  );
}

/* ── Section head: eyebrow + drawn rule ───────────────────────
   No decorative numbering — sections aren't a sequence. Where the
   content genuinely is ordered (Process), the step number is part
   of that section's own content instead.                        */
export function SectionLabel({
  label,
  className = "",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-[0.28em] text-ink-faint ${className}`}
    >
      <span className="h-px w-6 bg-navy" />
      {label}
    </div>
  );
}

/* ── Spec chip — a measurement, set like one ──────────────── */
export function SpecTag({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-plate border px-3 py-1.5 font-mono text-[0.68rem] uppercase tracking-[0.14em] ${
        active
          ? "border-navy/25 bg-navy/[0.05] text-navy"
          : "border-rule bg-surface text-ink-soft"
      } ${className}`}
    >
      {children}
    </span>
  );
}

/* ── Reveal: fade + a short rise. Nothing sweeps. ─────────── */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduce = useReducedMotion();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </MotionTag>
  );
}

/* ── Action: primary is a solid navy plate, ghost is a hairline ── */
export function Action({
  href,
  children,
  className = "",
  variant = "primary",
  onClick,
}: {
  href?: string;
  children: ReactNode;
  className?: string;
  variant?: "primary" | "ghost";
  onClick?: () => void;
}) {
  const styles =
    variant === "primary"
      ? "bg-navy text-white hover:bg-navy-hover"
      : "border border-rule-strong text-ink hover:border-navy hover:text-navy";

  return (
    <a
      href={href}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-plate px-7 py-3.5 font-mono text-[0.74rem] font-medium uppercase tracking-[0.18em] no-underline transition-colors duration-200 ${styles} ${className}`}
    >
      {children}
    </a>
  );
}

/* ── Count-up, triggered in view ──────────────────────────── */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  duration = 1.4,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setVal(to);
      return;
    }
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: setVal,
    });
    return () => controls.stop();
  }, [inView, to, duration, reduce]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ── Depth: the card approaches from behind the page plane and
   settles flush when it scrolls into view. No cursor tracking,
   no spotlight — the depth is the whole effect.                 */
export function Depth({
  children,
  index = 0,
  depth = 130,
  tilt = 7,
  className = "",
  cardClassName = "",
}: {
  children: ReactNode;
  index?: number;
  depth?: number;
  tilt?: number;
  className?: string;
  cardClassName?: string;
}) {
  // A one-shot entrance, not a scroll-linked transform: binding every card to
  // its own useScroll made each one re-measure its box on every frame.
  //
  // The perspective lives on the grid (see `depthGrid`) rather than on each
  // card, so a whole grid shares one 3D context. Per-card perspective plus
  // transform-style: preserve-3d gives every card its own context, which
  // blocks layer squashing — with a gallery's worth of images behind it that
  // is enough compositor memory to take the tab down.
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-8% 0px" });

  return (
    <div ref={ref} className={className}>
      <motion.div
        initial={reduce ? { opacity: 0 } : { opacity: 0, z: -depth, rotateX: tilt }}
        animate={
          inView
            ? reduce
              ? { opacity: 1 }
              : { opacity: 1, z: 0, rotateX: 0 }
            : undefined
        }
        transition={{
          duration: reduce ? 0.4 : 0.75,
          delay: index * 0.06,
          ease: [0.22, 1, 0.36, 1],
        }}
        style={reduce ? undefined : { transformOrigin: "center top" }}
        className={cardClassName}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Put this on the grid that wraps `Depth` cards: one shared 3D context. */
export const depthGrid = { perspective: "1200px" } as const;

export type CardEntrance = {
  origin?: string;
  initial: MotionProps["initial"];
  animate: MotionProps["animate"];
  transition: MotionProps["transition"];
};
