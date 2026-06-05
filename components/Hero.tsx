"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import HeroSpring from "./HeroSpring";
import { BlueprintGrid, MagneticButton, Counter, SpecTag } from "./hud";
import { useLanguage } from "@/lib/i18n";

const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];

const FLOAT_SPECS = [
  { text: "Ø 0.1 – 50 mm", className: "top-[22%] left-[2%]" },
  { text: "± 0.01 mm", className: "top-[58%] left-[6%]" },
  { text: "OD ≤ 500 mm", className: "bottom-[16%] right-[6%]" },
];

export default function Hero() {
  const { t } = useLanguage();
  const stats = STAT_VALUES.map((s, i) => ({ ...s, label: t.hero.stats[i] }));
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "26%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.85], [1, 0]);
  const springY = useTransform(scrollYProgress, [0, 1], [0, 130]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden bg-graphite"
    >
      {/* Atmospheric photo, heavily graded into graphite */}
      <div className="absolute inset-0 z-0">
        <img
          src="/banner/banner2.jpg"
          alt="Ruslie Spring manufacturing facility"
          className="w-full h-full object-cover object-center opacity-[0.16]"
          style={{ filter: "grayscale(1) contrast(1.1)" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, #0a0e14 0%, rgba(10,14,20,0.86) 42%, rgba(17,22,31,0.78) 100%)",
          }}
        />
      </div>

      <BlueprintGrid />

      {/* Cyan ambient glow */}
      <motion.div
        animate={
          reduce ? undefined : { opacity: [0.16, 0.32, 0.16], scale: [1, 1.12, 1] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[4%] top-[12%] w-[520px] h-[520px] rounded-full z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.16) 0%, transparent 68%)",
        }}
      />

      {/* Floating spec annotations */}
      {FLOAT_SPECS.map((s, i) => (
        <motion.div
          key={s.text}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 + i * 0.2, duration: 0.8 }}
          className={`absolute z-[2] hidden lg:block ${s.className}`}
        >
          <SpecTag>{s.text}</SpecTag>
        </motion.div>
      ))}

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between gap-10 pt-[68px]"
      >
        {/* Left content */}
        <div className="max-w-[640px]">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="mb-7"
          >
            <SpecTag active>{t.hero.badge}</SpecTag>
          </motion.div>

          {/* Kinetic split-text headline */}
          <h1 className="font-tech font-bold text-[clamp(3rem,6vw,5.4rem)] leading-[0.98] tracking-tight text-hud-silver mb-6">
            {t.hero.headline.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom mr-[0.28em]">
                <motion.span
                  initial={{ y: "110%" }}
                  animate={{ y: 0 }}
                  transition={{
                    duration: 0.85,
                    delay: 0.3 + i * 0.12,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className={`inline-block ${
                    i === t.hero.headline.length - 1 ? "text-cyan hud-glow-cyan" : ""
                  }`}
                >
                  {word}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
            className="font-body text-[1.05rem] text-hud-silver/55 leading-[1.8] max-w-[470px] mb-9"
          >
            {t.hero.paragraph}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.85 }}
            className="flex gap-4 flex-wrap mb-12"
          >
            <MagneticButton href="#products">{t.hero.ctaProducts}</MagneticButton>
            <MagneticButton href="#process" variant="ghost">
              {t.hero.ctaProcess}
            </MagneticButton>
          </motion.div>

          {/* Trust counters */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="flex gap-8 sm:gap-12"
          >
            {stats.map((s) => (
              <div key={s.label}>
                <div className="font-tech text-[2rem] font-bold text-hud-silver leading-none">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="font-mono text-[0.62rem] tracking-[0.16em] uppercase text-hud-mute mt-2">
                  {s.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Spring illustration — parallax on scroll */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          style={{ y: springY }}
          className="hidden lg:block w-[210px] h-[440px] flex-shrink-0"
        >
          <HeroSpring className="w-full h-full" coils={8} progress={scrollYProgress} />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={reduce ? undefined : { y: [0, 9, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
      >
        <span className="font-mono text-[0.6rem] text-hud-mute tracking-[0.3em] uppercase">
          {t.hero.scroll}
        </span>
        <div className="w-px h-9 bg-gradient-to-b from-cyan/70 to-transparent" />
      </motion.div>
    </section>
  );
}
