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
import { BlueprintGrid, SectionIndex } from "./hud";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";

// 3D spring is client-only (WebGL) and code-split out of the main bundle.
const SpringScene = dynamic(() => import("./SpringScene"), { ssr: false });

const STEP_META = [
  { n: "01", key: "wire", compress: 0, coils: 8 },
  { n: "02", key: "coil", compress: 0.16, coils: 9 },
  { n: "03", key: "heat", compress: 0.42, coils: 9 },
  { n: "04", key: "qc", compress: 0.24, coils: 8 },
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

  // Smoothed scroll value drives the spring for buttery, lag-free motion.
  const smooth = useSpring(scrollYProgress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001,
  });

  const railWidth = useTransform(
    scrollYProgress,
    [0, 1],
    ["0%", "100%"]
  );

  const step = STEPS[active];

  return (
    <section
      id="process"
      ref={ref}
      className="relative bg-graphite"
      style={{ height: stageEnabled ? "100vh" : `${STEPS.length * 90}vh` }}
    >
      <div className={`${stageEnabled ? "" : "sticky top-0"} h-screen overflow-hidden flex flex-col`}>
        <BlueprintGrid fade={false} />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(70% 55% at 70% 45%, rgba(34,211,238,0.08), transparent 70%)",
          }}
        />

        <div className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-6 lg:px-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-10">
          {/* Left — morphing copy */}
          <div className="pt-24 lg:pt-0">
            <SectionIndex index="02" label={t.process.label} className="mb-8" />
            <div className="font-mono text-[0.72rem] tracking-[0.2em] text-cyan/70 mb-4">
              {t.process.step} {step.n} / {String(STEPS.length).padStart(2, "0")}
            </div>

            <div className="relative min-h-[230px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.key}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -22 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <h3 className="font-tech font-bold text-[clamp(1.8rem,3.4vw,2.9rem)] leading-[1.05] text-hud-silver mb-5">
                    {step.title}
                  </h3>
                  <p className="font-body text-[1.02rem] text-hud-silver/55 leading-[1.85] max-w-[460px] mb-6">
                    {step.text}
                  </p>
                  <span className="inline-flex items-center gap-2 font-mono text-[0.74rem] tracking-[0.12em] uppercase text-cyan border border-cyan/35 bg-cyan/5 rounded px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan" />
                    {step.spec}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right — scroll-reactive 3D spring */}
          <div
            ref={sceneRef}
            className="relative hidden lg:flex justify-center items-center h-[62vh]"
          >
            {nearScene && <SpringScene progress={smooth} />}
          </div>
        </div>

        {/* Bottom progress rail */}
        <div className="relative z-10 max-w-7xl w-full mx-auto px-6 lg:px-10 pb-10">
          <div className="relative h-px w-full bg-white/10">
            <motion.div
              style={{ width: railWidth }}
              className="absolute left-0 top-0 h-px bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.8)]"
            />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-4">
            {STEPS.map((s, i) => (
              <div
                key={s.key}
                className={`flex items-center gap-2 font-mono text-[0.66rem] tracking-[0.14em] uppercase transition-colors duration-300 ${
                  i <= active ? "text-cyan" : "text-hud-mute/60"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === active
                      ? "bg-cyan shadow-[0_0_10px_rgba(34,211,238,0.9)]"
                      : i < active
                      ? "bg-cyan/60"
                      : "bg-white/15"
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
