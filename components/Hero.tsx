"use client";

import { useRef } from "react";
import { motion, useTransform, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { useSectionScrub } from "@/lib/scrollStage";
import { Action, Counter, GridTexture } from "./industrial";
import { useLanguage } from "@/lib/i18n";

const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];

// The capability plate: the numbers a buyer actually checks first.
const SPEC_PLATE = [
  { k: "Wire Ø", v: "0.1 – 50 mm" },
  { k: "Outside Ø", v: "1 – 500 mm" },
  { k: "Tolerance", v: "± 0.01 mm" },
];

export default function Hero() {
  const { t } = useLanguage();
  const stats = STAT_VALUES.map((s, i) => ({ ...s, label: t.hero.stats[i] }));
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useSectionScrub("hero", ref);
  const photoY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -60]);

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden bg-ground"
    >
      <GridTexture opacity={0.5} />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-14 px-6 pb-16 pt-[124px] lg:grid-cols-[1.05fr_1fr] lg:gap-20 lg:px-10 lg:pb-24">
        {/* ── Left: the claim ── */}
        <div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-8 flex items-center gap-3 font-mono text-[0.66rem] uppercase tracking-[0.28em] text-ink-faint"
          >
            <span className="h-px w-6 bg-navy" />
            {t.hero.badge}
          </motion.div>

          <h1 className="mb-7 font-display text-[clamp(2.6rem,5.4vw,4.6rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.025em] text-ink">
            {t.hero.headline.map((word, i) => (
              <span
                key={i}
                className="mr-[0.26em] inline-block overflow-hidden align-bottom"
              >
                <motion.span
                  initial={reduce ? { opacity: 0 } : { y: "108%" }}
                  animate={reduce ? { opacity: 1 } : { y: 0 }}
                  transition={{
                    duration: 0.8,
                    delay: 0.2 + i * 0.09,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.55 }}
            className="mb-9 max-w-[46ch] font-body text-[1.02rem] leading-[1.8] text-ink-soft"
          >
            {t.hero.paragraph}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.68 }}
            className="mb-14 flex flex-wrap gap-3"
          >
            <Action href="#products">{t.hero.ctaProducts}</Action>
            <Action href="#process" variant="ghost">
              {t.hero.ctaProcess}
            </Action>
          </motion.div>

          {/* Trust counters, set on a drawn rule */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="grid max-w-[520px] grid-cols-3 border-t border-rule pt-6"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-display text-[2.1rem] font-bold leading-none tracking-[-0.02em] text-ink">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-2 font-mono text-[0.6rem] uppercase leading-tight tracking-[0.16em] text-ink-faint">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── Right: the shop floor, plus the plate that specifies it ── */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          style={{ y: photoY }}
          className="relative"
        >
          <div className="relative aspect-square w-full overflow-hidden rounded-plate border border-rule bg-sunk shadow-plate">
            {/* priority: this is the LCP image — preload it instead of waiting for hydration */}
            <Image
              src="/banner/banner2.jpg"
              alt="Ruslie Spring manufacturing facility"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 45vw"
              className="object-cover object-center"
            />
          </div>

          <dl className="mt-px divide-y divide-rule border border-t-0 border-rule bg-surface">
            {SPEC_PLATE.map((row) => (
              <div
                key={row.k}
                className="flex items-baseline justify-between px-4 py-2.5"
              >
                <dt className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
                  {row.k}
                </dt>
                <dd className="font-mono text-[0.78rem] text-ink">{row.v}</dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-7 left-1/2 z-20 hidden -translate-x-1/2 flex-col items-center gap-2 lg:flex">
        <span className="font-mono text-[0.58rem] uppercase tracking-[0.3em] text-ink-faint">
          {t.hero.scroll}
        </span>
        <motion.div
          animate={reduce ? undefined : { scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="h-9 w-px origin-top bg-navy/50"
        />
      </div>
    </section>
  );
}
