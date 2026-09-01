"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent } from "framer-motion";
import { Factory, MapPin, Cog, ShieldCheck } from "lucide-react";
import { Reveal, SectionLabel, Counter } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";

const STAT_VALUES = [
  { to: 20, suffix: "+" },
  { to: 50, suffix: "K+" },
  { to: 80, suffix: "+" },
];

const FEATURE_ICONS = [Factory, MapPin, Cog, ShieldCheck];

export default function About() {
  const { t } = useLanguage();
  const stats = STAT_VALUES.map((s, i) => ({ ...s, label: t.about.stats[i] }));
  const features = FEATURE_ICONS.map((icon, i) => ({
    icon,
    title: t.about.features[i].title,
    text: t.about.features[i].text,
  }));
  const ref = useRef<HTMLElement>(null);
  const nativeInView = useInView(ref, { once: true, margin: "-100px" });
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("about", ref);
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.12) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;

  return (
    <section
      id="about"
      ref={ref}
      className={`relative border-t border-rule bg-surface px-6 lg:px-10 ${
        stageEnabled ? "flex h-screen items-center py-20" : "py-[110px]"
      }`}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-start gap-14 lg:grid-cols-2 lg:gap-24">
        {/* Left */}
        <div>
          <Reveal>
            <SectionLabel label={t.about.label} className="mb-6" />
            <h2 className="mb-7 font-display text-[clamp(1.8rem,3.4vw,2.9rem)] font-bold uppercase leading-[1.05] tracking-[-0.022em] text-ink">
              {t.about.heading[0]}
              <br />
              <span className="text-navy">{t.about.heading[1]}</span>
            </h2>
          </Reveal>

          <Reveal delay={0.08}>
            <p className="mb-5 font-body text-[0.98rem] leading-[1.85] text-ink-soft">
              {t.about.p1}
            </p>
            <p className="mb-10 font-body text-[0.98rem] leading-[1.85] text-ink-soft">
              {t.about.p2}
            </p>
          </Reveal>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.5 }}
                className="border-t-2 border-navy pt-4"
              >
                <div className="font-display text-[1.85rem] font-bold leading-none tracking-[-0.02em] text-ink">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="mt-2 font-mono text-[0.6rem] uppercase leading-tight tracking-[0.14em] text-ink-faint">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right — feature plates, stacked as one ruled block */}
        <div className="divide-y divide-rule border border-rule bg-ground">
          {features.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                animate={inView ? { opacity: 1, y: 0 } : undefined}
                transition={{ delay: 0.15 + i * 0.09, duration: 0.55 }}
                className="group flex gap-5 px-6 py-6 transition-colors duration-200 hover:bg-surface"
              >
                <Icon
                  size={20}
                  strokeWidth={1.6}
                  className="mt-0.5 flex-shrink-0 text-navy"
                />
                <div>
                  <div className="mb-1.5 font-display text-[0.95rem] font-semibold tracking-[-0.01em] text-ink">
                    {item.title}
                  </div>
                  <div className="font-body text-[0.85rem] leading-[1.7] text-ink-soft">
                    {item.text}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
