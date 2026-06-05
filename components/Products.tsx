"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type MotionProps,
} from "framer-motion";

const PARALLAX = [30, 56, 22, 44];
import {
  ArrowDownUp,
  MoveVertical,
  RotateCw,
  Spline,
  Activity,
  BatteryCharging,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { SectionIndex, CornerBrackets, type CardEntrance } from "./hud";
import { useLanguage } from "@/components/LanguageProvider";

/* Each product enters with a motion that imitates how that spring
   actually behaves mechanically — no two scroll reveals are alike. */
type VariantKey =
  | "compress"
  | "extend"
  | "torsion"
  | "unspool"
  | "zigzag"
  | "charge";

const VARIANTS: Record<VariantKey, CardEntrance> = {
  // Compression: squashes down, then springs back up to rest.
  compress: {
    origin: "bottom center",
    initial: { opacity: 0, scaleY: 1.65, y: -46 },
    animate: { opacity: [0, 1, 1, 1], scaleY: [1.65, 0.7, 1.08, 1], y: [-46, 6, 0, 0] },
    transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
  },
  // Extension: pulls out of a compressed coil, stretching to length.
  extend: {
    origin: "top center",
    initial: { opacity: 0, scaleY: 0.25, y: 34 },
    animate: { opacity: [0, 1, 1, 1], scaleY: [0.25, 1.18, 0.95, 1], y: [34, -6, 0, 0] },
    transition: { duration: 1.0, ease: [0.22, 1, 0.36, 1] },
  },
  // Torsion: winds in with a rotational twist before settling.
  torsion: {
    origin: "center",
    initial: { opacity: 0, rotate: -140, scale: 0.5 },
    animate: { opacity: [0, 1, 1], rotate: [-140, 16, 0], scale: [0.5, 1.07, 1] },
    transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
  },
  // Wire form: unspools left-to-right, un-skewing as it draws in.
  unspool: {
    origin: "left center",
    initial: { opacity: 0, clipPath: "inset(0 100% 0 0)", skewX: -12, x: -26 },
    animate: { opacity: 1, clipPath: "inset(0 0% 0 0)", skewX: 0, x: 0 },
    transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
  },
  // Zigzag: oscillates sideways like a flexing seat spring.
  zigzag: {
    origin: "center",
    initial: { opacity: 0, x: -58, rotate: -5 },
    animate: { opacity: [0, 1, 1, 1, 1], x: [-58, 36, -22, 10, 0], rotate: [-5, 4, -3, 1, 0] },
    transition: { duration: 1.05, ease: "easeOut" },
  },
  // Battery: rises into contact (paired with a charge sweep overlay).
  charge: {
    origin: "bottom center",
    initial: { opacity: 0, scaleY: 0.55, y: 28 },
    animate: { opacity: [0, 1, 1], scaleY: [0.55, 1.05, 1], y: [28, 0, 0] },
    transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
  },
};

const PRODUCT_META: { icon: LucideIcon; span: string; variant: VariantKey }[] = [
  { icon: ArrowDownUp, span: "lg:col-span-2", variant: "compress" },
  { icon: MoveVertical, span: "", variant: "extend" },
  { icon: RotateCw, span: "", variant: "torsion" },
  { icon: Spline, span: "", variant: "unspool" },
  { icon: Activity, span: "", variant: "zigzag" },
  { icon: BatteryCharging, span: "lg:col-span-2", variant: "charge" },
];

function ProductCard({
  meta,
  text,
  index,
}: {
  meta: (typeof PRODUCT_META)[number];
  text: { name: string; desc: string; tag: string };
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const Icon = meta.icon;
  const entrance = VARIANTS[meta.variant];
  const { tr } = useLanguage();

  // Continuous scroll-linked parallax drift (column-varied speed).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const mag = PARALLAX[index % PARALLAX.length];
  const py = useTransform(scrollYProgress, [0, 1], [mag, -mag]);

  // Pointer position (0..1) drives 3D tilt + the spotlight.
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), {
    stiffness: 150,
    damping: 16,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), {
    stiffness: 150,
    damping: 16,
  });
  const spotX = useTransform(mx, (v) => `${v * 100}%`);
  const spotY = useTransform(my, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(240px circle at ${spotX} ${spotY}, rgba(34,211,238,0.16), transparent 68%)`;

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

  const initialProp: MotionProps["initial"] = reduce
    ? { opacity: 0 }
    : entrance.initial;
  const animateProp: MotionProps["animate"] = inView
    ? reduce
      ? { opacity: 1 }
      : entrance.animate
    : undefined;
  const transitionProp: MotionProps["transition"] = reduce
    ? { duration: 0.5, delay: index * 0.07 }
    : { ...entrance.transition, delay: index * 0.07 };

  return (
    <motion.div
      className={meta.span}
      style={{ perspective: 1000, y: reduce ? 0 : py }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        initial={initialProp}
        animate={animateProp}
        transition={transitionProp}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          transformOrigin: entrance.origin ?? "center",
        }}
        className="group relative h-full min-h-[200px] rounded-xl border border-white/[0.08] bg-steel-700/30 p-7 overflow-hidden transition-colors duration-300 hover:border-cyan/40"
      >
        {/* faint blueprint texture, brightens on hover */}
        <div className="absolute inset-0 bg-dot-cyan [background-size:22px_22px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" />
        {/* cursor-follow spotlight */}
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
        {/* charge sweep — only the battery spring "powers up" on reveal */}
        {meta.variant === "charge" && !reduce && (
          <motion.div
            aria-hidden
            initial={{ y: "100%", opacity: 0 }}
            animate={inView ? { y: "-120%", opacity: [0, 0.9, 0] } : undefined}
            transition={{ duration: 1.1, delay: index * 0.07 + 0.2, ease: "easeOut" }}
            className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none"
            style={{
              background:
                "linear-gradient(0deg, transparent, rgba(34,211,238,0.22), transparent)",
            }}
          />
        )}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <CornerBrackets />
        </div>

        <div className="relative flex items-start justify-between mb-5">
          <div className="w-12 h-12 rounded-lg bg-cyan/10 border border-cyan/25 flex items-center justify-center transition-all duration-300 group-hover:bg-cyan/20 group-hover:scale-110 group-hover:-rotate-6">
            <Icon size={22} className="text-cyan" />
          </div>
          <span className="font-mono text-[0.66rem] text-hud-mute tracking-[0.16em] border border-white/10 rounded px-2 py-1 group-hover:text-cyan group-hover:border-cyan/30 transition-colors">
            {text.tag}
          </span>
        </div>

        <h3 className="relative font-tech text-[1.1rem] font-semibold text-hud-silver mb-2.5">
          {text.name}
        </h3>
        <p className="relative font-body text-[0.86rem] text-hud-silver/50 leading-[1.7] max-w-[42ch]">
          {text.desc}
        </p>

        <div className="relative mt-5 flex items-center justify-between">
          <div className="h-0.5 w-8 bg-cyan/50 rounded-full transition-all duration-300 group-hover:w-16" />
          <span className="flex items-center gap-1 font-mono text-[0.62rem] tracking-[0.16em] uppercase text-cyan opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            {tr.products.detail}
            <ArrowUpRight size={13} />
          </span>
        </div>

        {/* index watermark */}
        <span className="absolute bottom-4 right-5 font-tech font-bold text-[2.4rem] leading-none text-white/[0.03] group-hover:text-cyan/10 transition-colors duration-300 pointer-events-none select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Products() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const { tr } = useLanguage();

  return (
    <section
      id="products"
      ref={ref}
      className="relative bg-carbon py-[120px] px-6 lg:px-10 overflow-hidden border-t border-white/[0.06]"
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div style={{ y: headerY }} className="mb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionIndex index="03" label={tr.products.index} className="mb-6" />
            <h2 className="font-tech font-bold text-[clamp(2rem,4vw,3rem)] text-hud-silver">
              {tr.products.titlePrefix}{" "}<span className="text-cyan hud-glow-cyan">{tr.products.titleAccent}</span>
            </h2>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCT_META.map((meta, i) => (
            <ProductCard
              key={i}
              meta={meta}
              text={tr.products.items[i]}
              index={i}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
