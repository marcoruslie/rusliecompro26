"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Reveal, SectionLabel } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";

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

  return (
    <section
      id="capabilities"
      ref={ref}
      className={`relative overflow-hidden bg-navy px-6 text-white lg:px-10 ${
        stageEnabled ? "flex h-screen items-center py-20" : "py-[120px]"
      }`}
    >
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal>
          <SectionLabel label={t.capabilities.label} tone="dark" className="mb-5" />
          <h2 className="font-condensed font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold leading-[0.98] tracking-[-0.02em]">
            {t.capabilities.heading[0]} {t.capabilities.heading[1]}
          </h2>
        </Reveal>

        {/* Datasheet: label on the left, the figure set large on the right */}
        <dl className="border-t border-white/20">
          {caps.map((c, i) => (
            <Reveal
              key={c.label}
              delay={i * 0.06}
              className="relative flex items-baseline justify-between gap-6 border-b border-white/20 py-6"
            >
              <dt className="font-body text-[1rem] text-silver">{c.label}</dt>
              <dd className="font-condensed whitespace-nowrap font-display text-[clamp(2rem,4vw,3.2rem)] font-bold leading-none tabular-nums">
                {c.value}{" "}
                <span className="text-[0.5em] font-semibold text-silver">{c.unit}</span>
              </dd>
              <motion.span
                aria-hidden
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="absolute -bottom-px left-0 h-[2px] w-1/4 origin-left bg-white"
              />
            </Reveal>
          ))}
        </dl>
      </div>

      {/* Industries served */}
      <Reveal delay={0.1} className="mx-auto mt-20 max-w-7xl">
        <h3 className="mb-6 font-display text-[1.05rem] font-bold text-white">
          {t.capabilities.industriesTitle}
        </h3>
        <ul className="grid grid-cols-2 border-l border-t border-white/15 sm:grid-cols-3 lg:grid-cols-5">
          {industries.map((ind) => (
            <li
              key={ind}
              className="border-b border-r border-white/15 px-5 py-4 font-body text-[0.95rem] text-silver-light"
            >
              {ind}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
