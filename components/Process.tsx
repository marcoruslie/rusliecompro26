"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  AnimatePresence,
  useSpring,
  useTransform,
  useMotionValueEvent,
} from "framer-motion";
import dynamic from "next/dynamic";
import { SectionLabel, GridTexture } from "./industrial";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";

// 3D spring is client-only (WebGL) and code-split out of the main bundle.
const SpringScene = dynamic(() => import("./SpringScene"), { ssr: false });

const STEP_META = [
  { n: "01", key: "wire" },
  { n: "02", key: "coil" },
  { n: "03", key: "heat" },
  { n: "04", key: "qc" },
];

export default function Process() {
  const { t } = useLanguage();
  const STEPS = STEP_META.map((meta, i) => ({
    ...meta,
    title: t.process.steps[i].title,
    text: t.process.steps[i].text,
    spec: t.process.steps[i].spec,
  }));
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  // Mount the 3D spring only when its container approaches the viewport, so the
  // three.js chunk isn't fetched during initial load. Observing the container
  // (not the section) also skips it entirely on mobile, where the wrapper is
  // display:none and never intersects.
  const sceneRef = useRef<HTMLDivElement>(null);
  const [nearScene, setNearScene] = useState(false);
  useEffect(() => {
    const el = sceneRef.current;
    if (!el || nearScene) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setNearScene(true);
      },
      // Start fetching ~1 viewport early so the scene is ready before it shows.
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [nearScene]);
  const { stageEnabled } = useScrollStage();
  const scrollYProgress = useSectionScrub("process", ref);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(STEPS.length - 1, Math.floor(v * STEPS.length));
    setActive(idx < 0 ? 0 : idx);
  });

  // Smoothed scroll value drives the spring for lag-free motion.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001,
  });

  const railWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  const step = STEPS[active];

  return (
    <section
      id="process"
      ref={ref}
      className="relative border-t border-rule bg-sunk"
      style={{ height: stageEnabled ? "100vh" : `${STEPS.length * 90}vh` }}
    >
      <div
        className={`${
          stageEnabled ? "" : "sticky top-0"
        } flex h-screen flex-col overflow-hidden`}
      >
        <GridTexture fade={false} opacity={0.5} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-6 lg:grid-cols-2 lg:px-10">
          {/* Left — the step */}
          <div className="pt-24 lg:pt-0">
            <SectionLabel label={t.process.label} className="mb-8" />

            <div className="mb-5 font-mono text-[0.68rem] tracking-[0.2em] text-ink-faint">
              {t.process.step} {step.n} /{" "}
              {String(STEPS.length).padStart(2, "0")}
            </div>

            <div className="relative min-h-[230px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="mb-5 font-display text-[clamp(1.7rem,3.2vw,2.8rem)] font-bold uppercase leading-[1.05] tracking-[-0.022em] text-ink">
                    {step.title}
                  </h3>
                  <p className="mb-6 max-w-[46ch] font-body text-[0.98rem] leading-[1.8] text-ink-soft">
                    {step.text}
                  </p>
                  <span className="inline-flex items-center rounded-plate border border-rule bg-surface px-3 py-1.5 font-mono text-[0.72rem] uppercase tracking-[0.12em] text-ink">
                    {step.spec}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right — the coil, formed by scroll */}
          <div
            ref={sceneRef}
            className="relative hidden h-[62vh] items-center justify-center lg:flex"
          >
            {nearScene && <SpringScene progress={smooth} />}
          </div>
        </div>

        {/* Bottom progress rail */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-10 lg:px-10">
          <div className="relative h-px w-full bg-rule-strong">
            <motion.div
              style={{ width: railWidth }}
              className="absolute left-0 top-0 h-px bg-navy"
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`flex items-center gap-2 font-mono text-[0.64rem] uppercase tracking-[0.14em] transition-colors duration-300 ${
                  i <= active ? "text-navy" : "text-ink-faint"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 transition-colors duration-300 ${
                    i <= active ? "bg-navy" : "bg-rule-strong"
                  }`}
                />
                <span className="hidden sm:inline">{s.title.split(" ")[0]}</span>
                <span className="sm:hidden">{s.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
