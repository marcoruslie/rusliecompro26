"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { SectionIndex, TiltSpotlightCard } from "./hud";

const PARALLAX = [30, 54, 20, 44];

const CAPS = [
  { label: "Wire Diameter", value: "0.1 – 50", unit: "mm" },
  { label: "Spring OD", value: "1 – 500", unit: "mm" },
  { label: "Free Length", value: "≤ 1500", unit: "mm" },
  { label: "Tolerance", value: "± 0.01", unit: "mm" },
];

const INDUSTRIES = [
  "Automotive",
  "Aerospace",
  "Medical Devices",
  "Electronics",
  "Defense",
  "Oil & Gas",
  "Marine",
  "Construction",
  "Agriculture",
  "Railway",
];

export default function Capabilities() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [60, -60]);

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
            <SectionIndex index="04" label="Technical Specs" className="mb-6" />
            <h2 className="font-tech font-bold text-[clamp(2rem,3.6vw,3rem)] text-hud-silver">
              Manufacturing{" "}
              <span className="text-cyan hud-glow-cyan">Capabilities</span>
            </h2>
          </motion.div>
        </motion.div>

        {/* Instrument readout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {CAPS.map((c, i) => (
            <TiltSpotlightCard
              key={c.label}
              index={i}
              parallax={PARALLAX[i % PARALLAX.length]}
              cardClassName="rounded-xl border border-white/[0.08] bg-carbon px-6 py-7"
            >
              <div className="font-mono text-[0.66rem] tracking-[0.18em] uppercase text-hud-mute mb-4 group-hover:text-cyan/70 transition-colors">
                {c.label}
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
            Industries We Serve
          </p>
          <div className="flex flex-wrap gap-2.5">
            {INDUSTRIES.map((ind, i) => (
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
