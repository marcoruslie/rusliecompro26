"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent } from "framer-motion";
import { Depth, SectionLabel, depthGrid } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";

// The four numbers that decide whether a part is quotable here.
// `label` is filled from the translation dictionary by index.
const CAPS = [
  { value: "0.1 – 50", unit: "mm" },
  { value: "1 – 500", unit: "mm" },
  { value: "≤ 1500", unit: "mm" },
  { value: "± 0.01", unit: "mm" },
];

export default function Capabilities() {
  const { t } = useLanguage();
  const caps = CAPS.map((c, i) => ({ ...c, label: t.capabilities.caps[i] }));
  const industries = t.capabilities.industries;
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("capabilities", ref);
  const nativeInView = useInView(ref, { once: true, margin: "-80px" });
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.1) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;

  return (
    <section
      id="capabilities"
      ref={ref}
      className={`relative overflow-hidden border-t border-rule bg-ground px-6 lg:px-10 ${
        stageEnabled ? "flex h-screen items-center py-20" : "py-[110px]"
      }`}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.55 }}
          className="mb-12"
        >
          <SectionLabel label={t.capabilities.label} className="mb-6" />
          <h2 className="font-display text-[clamp(1.9rem,3.4vw,2.9rem)] font-bold uppercase tracking-[-0.022em] text-ink">
            {t.capabilities.heading[0]}{" "}
            <span className="text-navy">{t.capabilities.heading[1]}</span>
          </h2>
        </motion.div>

        {/* Capability plates */}
        <div style={depthGrid} className="mb-16 grid grid-cols-1 gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-4">
          {caps.map((c, i) => (
            <Depth
              key={c.label}
              index={i}
              depth={110}
              tilt={6}
              cardClassName="h-full bg-surface px-6 py-8 transition-colors duration-200 hover:bg-sunk"
            >
              <div className="mb-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
                {c.label}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-display text-[1.85rem] font-bold leading-none tracking-[-0.025em] text-ink">
                  {c.value}
                </span>
                <span className="font-mono text-sm text-ink-faint">{c.unit}</span>
              </div>
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-12% 0px" }}
                transition={{
                  duration: 0.8,
                  delay: 0.15 + i * 0.07,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="mt-6 h-0.5 w-full origin-left bg-navy"
              />
            </Depth>
          ))}
        </div>

        {/* Industries served */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.55, delay: 0.3 }}
        >
          <p className="mb-5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
            {t.capabilities.industriesTitle}
          </p>
          <div className="flex flex-wrap gap-2">
            {industries.map((ind, i) => (
              <motion.span
                key={ind}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : undefined}
                transition={{ delay: 0.4 + i * 0.035, duration: 0.35 }}
                className="rounded-plate border border-rule bg-surface px-4 py-2 font-mono text-[0.72rem] tracking-[0.06em] text-ink-soft transition-colors duration-200 hover:border-navy hover:text-navy"
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
