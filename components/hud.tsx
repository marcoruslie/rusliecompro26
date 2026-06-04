"use client";

/* ─────────────────────────────────────────────────────────────
   Engineering-HUD motion primitives
   Shared building blocks for the Ruslie Spring marketing redesign.
   All animation honors prefers-reduced-motion.
   ───────────────────────────────────────────────────────────── */

import {
  useRef,
  useState,
  useEffect,
  type ReactNode,
  type ElementType,
} from "react";
import {
  motion,
  useInView,
  useScroll,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  animate,
} from "framer-motion";

/* ── Blueprint grid texture ───────────────────────────────── */
export function BlueprintGrid({
  className = "",
  fade = true,
}: {
  className?: string;
  fade?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 hud-blueprint ${className}`}
      style={
        fade
          ? {
              maskImage:
                "radial-gradient(115% 90% at 50% 0%, black 35%, transparent 78%)",
              WebkitMaskImage:
                "radial-gradient(115% 90% at 50% 0%, black 35%, transparent 78%)",
            }
          : undefined
      }
    />
  );
}

/* ── Corner brackets framing a panel ──────────────────────── */
export function CornerBrackets({
  color = "rgba(34,211,238,0.55)",
  size = 14,
}: {
  color?: string;
  size?: number;
}) {
  const base = "absolute w-3.5 h-3.5 pointer-events-none";
  const s = { width: size, height: size, borderColor: color } as const;
  return (
    <>
      <span className={`${base} top-0 left-0 border-t border-l`} style={s} />
      <span className={`${base} top-0 right-0 border-t border-r`} style={s} />
      <span className={`${base} bottom-0 left-0 border-b border-l`} style={s} />
      <span className={`${base} bottom-0 right-0 border-b border-r`} style={s} />
    </>
  );
}

/* ── Mono section index: "01 / WHO WE ARE" ────────────────── */
export function SectionIndex({
  index,
  label,
  tone = "cyan",
  className = "",
}: {
  index: string;
  label: string;
  tone?: "cyan" | "mute";
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-3 font-mono text-[0.7rem] tracking-[0.32em] uppercase ${className}`}
    >
      <span className={tone === "cyan" ? "text-cyan" : "text-hud-mute"}>
        {index}
      </span>
      <span className="h-px w-8 bg-cyan/40" />
      <span className="text-hud-mute">{label}</span>
    </div>
  );
}

/* ── Mono spec tag / measurement chip ─────────────────────── */
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
      className={`inline-flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.12em] uppercase px-3 py-1.5 rounded border ${
        active
          ? "text-cyan border-cyan/40 bg-cyan/5"
          : "text-hud-mute border-white/10 bg-white/[0.02]"
      } ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          active ? "bg-cyan" : "bg-hud-mute/60"
        }`}
      />
      {children}
    </span>
  );
}

/* ── Scan-reveal: fade/slide up + a one-shot cyan sweep ───── */
export function ScanReveal({
  children,
  delay = 0,
  y = 26,
  className = "",
  as = "div",
  scan = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: ElementType;
  scan?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const reduce = useReducedMotion();
  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`relative ${className}`}
    >
      {children}
      {scan && !reduce && (
        <motion.span
          aria-hidden
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: [0, 1, 0] } : {}}
          transition={{ duration: 0.9, delay: delay + 0.05, ease: "easeOut" }}
          className="pointer-events-none absolute left-0 right-0 h-px"
          style={{
            top: 0,
            background:
              "linear-gradient(90deg, transparent, rgba(34,211,238,0.9), transparent)",
            boxShadow: "0 0 12px rgba(34,211,238,0.7)",
          }}
        />
      )}
    </MotionTag>
  );
}

/* ── Magnetic button (anchor) ─────────────────────────────── */
export function MagneticButton({
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
  const ref = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 220, damping: 18 });

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 18);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 14);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  const styles =
    variant === "primary"
      ? "bg-cyan text-graphite hover:shadow-cyan-glow"
      : "border border-white/20 text-hud-silver hover:border-cyan/60 hover:text-cyan";

  return (
    <motion.a
      ref={ref}
      href={href}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={reset}
      style={{ x, y }}
      whileTap={{ scale: 0.96 }}
      className={`group relative inline-flex items-center justify-center gap-2 rounded font-mono text-[0.78rem] font-medium tracking-[0.18em] uppercase px-7 py-3.5 no-underline transition-[box-shadow,border-color,color] duration-300 ${styles} ${className}`}
    >
      {children}
    </motion.a>
  );
}

/* ── Count-up number, triggered in view ───────────────────── */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
  className = "",
  duration = 1.8,
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
      onUpdate: (v) => setVal(v),
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

/* ── Card with cursor 3D tilt + follow-spotlight + reveal ──── */
export function TiltSpotlightCard({
  index = 0,
  parallax = 0,
  cardClassName = "",
  wrapperClassName = "",
  children,
}: {
  index?: number;
  parallax?: number;
  cardClassName?: string;
  wrapperClassName?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });

  // Continuous scroll-linked parallax drift.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const py = useTransform(scrollYProgress, [0, 1], [parallax, -parallax]);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [6, -6]), {
    stiffness: 150,
    damping: 16,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-6, 6]), {
    stiffness: 150,
    damping: 16,
  });
  const spotX = useTransform(mx, (v) => `${v * 100}%`);
  const spotY = useTransform(my, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${spotX} ${spotY}, rgba(34,211,238,0.15), transparent 68%)`;

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      className={wrapperClassName}
      style={{ perspective: 1000, y: reduce ? 0 : py }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ type: "spring", stiffness: 90, damping: 18, delay: index * 0.07 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={`group relative h-full overflow-hidden transition-colors duration-300 hover:border-cyan/40 ${cardClassName}`}
      >
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <CornerBrackets />
        </div>
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </motion.div>
  );
}
