"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { SectionIndex, TiltSpotlightCard, type CardEntrance } from "./hud";
import { useLanguage } from "@/components/LanguageProvider";

const PARALLAX = [30, 54, 20, 44];

// Each spec card animates in a way that mirrors what it measures.
const CAPS: {
  value: string;
  unit: string;
  entrance: CardEntrance;
}[] = [
  {
    value: "0.1 – 50",
    unit: "mm",
    // Caliper close: clamps shut horizontally from the left.
    entrance: {
      origin: "left center",
      initial: { opacity: 0, scaleX: 0.12, x: -46 },
      animate: { opacity: [0, 1, 1], scaleX: [0.12, 1.06, 1], x: [-46, 4, 0] },
      transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] },
    },
  },
  {
    value: "1 – 500",
    unit: "mm",
    // Aperture: irises open from the center with a slight twist.
    entrance: {
      origin: "center",
      initial: { opacity: 0, scale: 0.32, rotate: -10 },
      animate: { opacity: [0, 1, 1], scale: [0.32, 1.07, 1], rotate: [-10, 3, 0] },
      transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
    },
  },
  {
    value: "≤ 1500",
    unit: "mm",
    // Elongate: extends upward like a measured length.
    entrance: {
      origin: "bottom center",
      initial: { opacity: 0, scaleY: 0.06, y: 32 },
      animate: { opacity: [0, 1, 1], scaleY: [0.06, 1.05, 1], y: [32, -4, 0] },
      transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] },
    },
  },
  {
    value: "± 0.01",
    unit: "mm",
    // Precision snap: overshoots then jitters into an exact lock.
    entrance: {
      origin: "center",
      initial: { opacity: 0, scale: 1.32 },
      animate: {
        opacity: [0, 1, 1, 1, 1],
        scale: [1.32, 0.97, 1.01, 0.997, 1],
        x: [0, -3, 3, -1, 0],
      },
      transition: { duration: 0.7, ease: [0.5, 0, 0.2, 1] },
    },
  },
];

export default function Capabilities() {
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
      id="capabilities"
      ref={ref}
      className="relative bg-graphite py-[120px] px-6 lg:px-10 border-t border-white/[0.06] overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div style={{ y: headerY }} className="mb-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionIndex index="04" label={tr.capabilities.index} className="mb-6" />
            <h2 className="font-tech font-bold text-[clamp(2rem,3.6vw,3rem)] text-hud-silver">
              {tr.capabilities.titlePrefix}{" "}
              <span className="text-cyan hud-glow-cyan">{tr.capabilities.titleAccent}</span>
            </h2>
          </motion.div>
        </motion.div>

        {/* Instrument readout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {CAPS.map((c, i) => (
            <TiltSpotlightCard
              key={i}
              index={i}
              parallax={PARALLAX[i % PARALLAX.length]}
              entrance={c.entrance}
              cardClassName="rounded-xl border border-white/[0.08] bg-carbon px-6 py-7"
            >
              <div className="font-mono text-[0.66rem] tracking-[0.18em] uppercase text-hud-mute mb-4 group-hover:text-cyan/70 transition-colors">
                {tr.capabilities.caps[i]}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-tech text-[1.9rem] font-bold text-hud-silver leading-none">
                  {c.value}
                </span>
                <span className="font-mono text-sm text-cyan">{c.unit}</span>
              </div>
              {/* readout bar */}
              <div className="mt-5 h-px w-full bg-white/8 overflow-hidden">
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true, margin: "-12% 0px" }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full bg-cyan/70 origin-left"
                />
              </div>
            </TiltSpotlightCard>
          ))}
        </div>

        {/* Industries */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="font-mono text-[0.66rem] text-hud-mute tracking-[0.2em] uppercase mb-5">
            {tr.capabilities.industriesHeading}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {tr.capabilities.industries.map((ind, i) => (
              <motion.span
                key={ind}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.04 }}
                whileHover={{ y: -2 }}
                className="font-mono text-[0.74rem] tracking-[0.08em] text-hud-silver/70 border border-white/12 rounded-full px-4 py-2 cursor-default bg-white/[0.02] hover:border-cyan/50 hover:text-cyan transition-colors duration-200"
              >
                {ind}
              </motion.span>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
