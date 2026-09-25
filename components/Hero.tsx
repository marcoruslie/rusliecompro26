"use client";

import { useRef } from "react";
import { motion, useTransform, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useSectionScrub } from "@/lib/scrollStage";
import { Action, Counter } from "./industrial";
import { useLanguage } from "@/lib/i18n";

// The figures along the hero's bottom edge. The first three are track record
// (labels from t.hero.stats); the last is the tolerance we hold, the number a
// buyer checks before anything else (label from t.capabilities.caps[3]).
const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];

export default function Hero() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const scrollYProgress = useSectionScrub("hero", ref);
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", reduce ? "0%" : "12%"]);

  const stats = STAT_VALUES.map((s, i) => ({ ...s, label: t.hero.stats[i] }));

  return (
    <section
      id="hero"
      ref={ref}
      className="relative flex min-h-[100svh] flex-col overflow-hidden bg-navy-dark text-white"
    >
      {/* Shop-floor photo, pushed back behind a navy wash so the type holds */}
      <motion.div style={{ y: photoY }} className="absolute inset-0 -bottom-[12%]">
        {/* priority: this is the LCP image — preload it instead of waiting for hydration */}
        <Image
          src="/banner/banner2.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(1,14,36,0.95) 0%, rgba(1,14,36,0.86) 38%, rgba(2,29,71,0.55) 70%, rgba(2,29,71,0.35) 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-1/3"
        style={{ background: "linear-gradient(to top, rgba(1,14,36,0.9), transparent)" }}
      />

      {/* ── The claim ── */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-6 pb-16 pt-[128px] lg:px-10 lg:pt-[140px]">
        <div className="max-w-[820px]">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mb-7 flex items-center gap-3 font-display text-[0.95rem] font-semibold text-silver"
          >
            <span className="h-[3px] w-5 bg-silver" />
            {t.hero.badge}
          </motion.p>

          <h1 className="font-condensed mb-8 font-display text-[clamp(3.1rem,8.4vw,7.4rem)] font-extrabold leading-[0.9] tracking-[-0.02em]">
            {t.hero.headline.map((word, i) => (
              <span key={i} className="mr-[0.22em] inline-block overflow-hidden align-bottom">
                <motion.span
                  initial={reduce ? { opacity: 0 } : { y: "105%" }}
                  animate={reduce ? { opacity: 1 } : { y: 0 }}
                  transition={{ duration: 0.85, delay: 0.2 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.6 }}
            className="mb-10 max-w-[52ch] font-body text-[1.08rem] leading-[1.75] text-silver-light/85"
          >
            {t.hero.paragraph}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.72 }}
            className="flex flex-wrap gap-3"
          >
            <Action href="#products" variant="inverse">
              {t.hero.ctaProducts} <ArrowRight size={16} />
            </Action>
            <Action href="#process" variant="outline">
              {t.hero.ctaProcess}
            </Action>
          </motion.div>
        </div>
      </div>

      {/* ── Figures strip, ruled like the title block of a drawing ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9 }}
        className="relative z-10 border-t border-white/15 bg-navy-dark/60 backdrop-blur-sm"
      >
        <dl className="mx-auto grid max-w-7xl grid-cols-2 lg:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`flex flex-col-reverse gap-2 border-white/15 px-6 py-6 lg:px-10 lg:py-7 ${
                i % 2 === 1 ? "border-l" : ""
              } ${i >= 2 ? "border-t lg:border-t-0" : ""} ${i === 2 ? "lg:border-l" : ""}`}
            >
              <dt className="font-body text-[0.85rem] text-silver">{s.label}</dt>
              <dd className="font-condensed font-display text-[clamp(2rem,3.4vw,2.8rem)] font-bold leading-none">
                <Counter to={s.to} suffix={s.suffix} />
              </dd>
            </div>
          ))}
          <div className="flex flex-col-reverse gap-2 border-l border-t border-white/15 px-6 py-6 lg:border-t-0 lg:px-10 lg:py-7">
            <dt className="font-body text-[0.85rem] text-silver">{t.capabilities.caps[3]}</dt>
            <dd className="font-condensed font-display text-[clamp(2rem,3.4vw,2.8rem)] font-bold leading-none">
              ± 0.01 <span className="text-[0.55em] font-semibold text-silver">mm</span>
            </dd>
          </div>
        </dl>
      </motion.div>
    </section>
  );
}
