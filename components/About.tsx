"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Factory, MapPin, Cog, ShieldCheck } from "lucide-react";
import {
  ScanReveal,
  SectionIndex,
  CornerBrackets,
  Counter,
} from "./hud";

const STATS = [
  { to: 20, suffix: "+", label: "Years of Excellence" },
  { to: 50, suffix: "K+", label: "Springs Daily" },
  { to: 80, suffix: "+", label: "Companies Served" },
];

const FEATURES = [
  {
    icon: Factory,
    title: "Indonesian Manufacturing Excellence",
    text: "High-precision spring manufacturing proudly made in Indonesia, delivering global-standard quality without relying on imports.",
  },
  {
    icon: MapPin,
    title: "Proudly Made in Indonesia",
    text: "World-class springs manufactured locally to support national industry and reduce dependence on imported components.",
  },
  {
    icon: Cog,
    title: "Custom Industry Solutions",
    text: "Custom-engineered springs tailored to automotive, machinery, and manufacturing needs across Indonesian industry.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted Domestic Quality",
    text: "Every spring is inspected and load-tested to guarantee consistent performance — proof that local products meet world-class standards.",
  },
];

export default function About() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  return (
    <section
      id="about"
      ref={ref}
      className="relative bg-carbon py-[120px] px-6 lg:px-10 border-t border-white/[0.06]"
    >
      <div className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
        {/* Left */}
        <div>
          <ScanReveal>
            <SectionIndex index="01" label="Who We Are" className="mb-6" />
            <h2 className="font-tech font-bold text-[clamp(1.9rem,3.6vw,3rem)] leading-[1.08] text-hud-silver mb-7">
              Two Decades of
              <br />
              <span className="text-cyan hud-glow-cyan">Springmaking Mastery</span>
            </h2>
          </ScanReveal>

          <ScanReveal delay={0.1} scan={false}>
            <p className="font-body text-[1rem] text-hud-silver/55 leading-[1.9] mb-5">
              Ruslie Spring has grown from a small local workshop into a trusted
              Indonesian spring manufacturer. Today we support domestic industry
              with precision springs engineered to international standards.
            </p>
            <p className="font-body text-[1rem] text-hud-silver/55 leading-[1.9] mb-10">
              We serve applications where failure is not an option — automotive,
              electronics, defense, and heavy engineering — holding the tightest
              tolerances with zero compromise.
            </p>
          </ScanReveal>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 18 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="border-l-2 border-cyan/60 pl-4"
              >
                <div className="font-tech text-[1.9rem] font-bold text-hud-silver leading-none">
                  <Counter to={s.to} suffix={s.suffix} />
                </div>
                <div className="font-mono text-[0.62rem] text-hud-mute uppercase tracking-[0.14em] mt-2 leading-tight">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right — feature cards */}
        <div className="flex flex-col gap-4">
          {FEATURES.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.6 }}
                whileHover={{ y: -3 }}
                className="group relative flex gap-4 p-5 rounded-xl border border-white/[0.07] bg-steel-700/40 hover:border-cyan/30 transition-colors duration-300"
              >
                <CornerBrackets color="rgba(34,211,238,0)" />
                <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <CornerBrackets />
                </div>
                <div className="w-11 h-11 rounded-lg bg-cyan/10 border border-cyan/25 flex items-center justify-center flex-shrink-0">
                  <Icon size={20} className="text-cyan" />
                </div>
                <div>
                  <div className="font-tech font-semibold text-hud-silver text-[0.96rem] mb-1.5">
                    {item.title}
                  </div>
                  <div className="font-body text-[0.84rem] text-hud-silver/50 leading-[1.65]">
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
