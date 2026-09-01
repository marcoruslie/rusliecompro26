"use client";

import { useRef, useState } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useTransform,
  useMotionValueEvent,
  type MotionProps,
} from "framer-motion";
import {
  ArrowDownUp,
  MoveVertical,
  RotateCw,
  Spline,
  Activity,
  BatteryCharging,
  type LucideIcon,
} from "lucide-react";
import { SectionLabel, type CardEntrance } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, usePanY, useScrollStage } from "@/lib/scrollStage";

/* Each product enters with a motion that imitates how that spring
   actually behaves under load — the one place on the page where
   animation carries information rather than decoration. Amplitudes
   are kept small so the grid still reads as a catalogue. */
type VariantKey =
  | "compress"
  | "extend"
  | "torsion"
  | "unspool"
  | "zigzag"
  | "charge";

const VARIANTS: Record<VariantKey, CardEntrance> = {
  // Compression: squashes down, then returns to free length.
  compress: {
    origin: "bottom center",
    initial: { opacity: 0, scaleY: 1.28, y: -20 },
    animate: { opacity: [0, 1, 1], scaleY: [1.28, 0.88, 1], y: [-20, 3, 0] },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
  // Extension: pulls out of a closed coil to working length.
  extend: {
    origin: "top center",
    initial: { opacity: 0, scaleY: 0.62, y: 16 },
    animate: { opacity: [0, 1, 1], scaleY: [0.62, 1.06, 1], y: [16, -3, 0] },
    transition: { duration: 0.72, ease: [0.22, 1, 0.36, 1] },
  },
  // Torsion: winds in through its working angle.
  torsion: {
    origin: "center",
    initial: { opacity: 0, rotate: -22, scale: 0.9 },
    animate: { opacity: [0, 1, 1], rotate: [-22, 4, 0], scale: [0.9, 1.02, 1] },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
  },
  // Wire form: unspools left to right off the coiler.
  unspool: {
    origin: "left center",
    initial: { opacity: 0, clipPath: "inset(0 100% 0 0)" },
    animate: { opacity: 1, clipPath: "inset(0 0% 0 0)" },
    transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
  },
  // Zigzag: flexes sideways like a seat spring taking weight.
  zigzag: {
    origin: "center",
    initial: { opacity: 0, x: -26 },
    animate: { opacity: [0, 1, 1, 1], x: [-26, 10, -4, 0] },
    transition: { duration: 0.75, ease: "easeOut" },
  },
  // Battery contact: rises into contact.
  charge: {
    origin: "bottom center",
    initial: { opacity: 0, scaleY: 0.8, y: 14 },
    animate: { opacity: [0, 1, 1], scaleY: [0.8, 1.02, 1], y: [14, 0, 0] },
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
  },
};

type Product = {
  name: string;
  desc: string;
  icon: LucideIcon;
  tag: string;
  span: string;
  variant: VariantKey;
};

// Non-text fields; name/desc/tag come from the translation dictionary by index.
const PRODUCT_META: { icon: LucideIcon; span: string; variant: VariantKey }[] = [
  { icon: ArrowDownUp, span: "lg:col-span-2", variant: "compress" },
  { icon: MoveVertical, span: "", variant: "extend" },
  { icon: RotateCw, span: "", variant: "torsion" },
  { icon: Spline, span: "", variant: "unspool" },
  { icon: Activity, span: "", variant: "zigzag" },
  { icon: BatteryCharging, span: "lg:col-span-2", variant: "charge" },
];

function ProductCard({ p, index }: { p: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const Icon = p.icon;
  const entrance = VARIANTS[p.variant];

  const initialProp: MotionProps["initial"] = reduce
    ? { opacity: 0 }
    : entrance.initial;
  const animateProp: MotionProps["animate"] = inView
    ? reduce
      ? { opacity: 1 }
      : entrance.animate
    : undefined;
  const transitionProp: MotionProps["transition"] = reduce
    ? { duration: 0.4, delay: index * 0.05 }
    : { ...entrance.transition, delay: index * 0.06 };

  return (
    <div className={p.span}>
      <motion.div
        ref={ref}
        initial={initialProp}
        animate={animateProp}
        transition={transitionProp}
        style={{ transformOrigin: entrance.origin ?? "center" }}
        className="group relative flex h-full min-h-[200px] flex-col bg-surface p-7 transition-colors duration-200 hover:bg-sunk"
      >
        <div className="mb-6 flex items-start justify-between">
          <Icon size={22} strokeWidth={1.5} className="text-navy" />
          <span className="rounded-plate border border-rule px-2 py-1 font-mono text-[0.62rem] tracking-[0.14em] text-ink-faint">
            {p.tag}
          </span>
        </div>

        <h3 className="mb-2.5 font-display text-[1.05rem] font-semibold tracking-[-0.012em] text-ink">
          {p.name}
        </h3>
        <p className="max-w-[44ch] font-body text-[0.85rem] leading-[1.7] text-ink-soft">
          {p.desc}
        </p>

        <div className="mt-auto pt-6">
          <div className="h-0.5 w-8 bg-navy transition-all duration-300 group-hover:w-16" />
        </div>
      </motion.div>
    </div>
  );
}

export default function Products() {
  const { t } = useLanguage();
  const products: Product[] = PRODUCT_META.map((meta, i) => ({
    ...meta,
    name: t.products.items[i].name,
    desc: t.products.items[i].desc,
    tag: t.products.items[i].tag,
  }));
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

  return (
    <section
      id="products"
      ref={ref}
      className={`relative overflow-hidden border-t border-rule bg-ground px-6 lg:px-10 ${
        stageEnabled ? "h-screen py-20" : "py-[110px]"
      }`}
    >
      <motion.div
        ref={contentRef}
        style={{ y: panY }}
        className="relative z-10 mx-auto max-w-7xl"
      >
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <SectionLabel label={t.products.label} className="mb-6" />
          <h2 className="font-display text-[clamp(1.9rem,3.6vw,2.9rem)] font-bold uppercase tracking-[-0.022em] text-ink">
            {t.products.heading[0]}{" "}
            <span className="text-navy">{t.products.heading[1]}</span>
          </h2>
        </motion.div>

        {/* One ruled block: gap-px over a rule-coloured ground draws the grid */}
        <div className="grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {products.map((p, i) => (
            <ProductCard key={i} p={p} index={i} />
          ))}
        </div>
      </motion.div>
    </section>
  );
}
