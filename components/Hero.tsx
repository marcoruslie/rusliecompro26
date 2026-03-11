"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import SpringSVG from "./SpringSVG";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "35%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section
      ref={ref}
      className="relative min-h-screen flex items-center overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #021d47 0%, #031d4a 50%, #08142a 100%)",
      }}
    >
      {/* ── Background image with overlay ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/banner/banner2.jpg" // ← replace with your actual image path
          alt="Ruslie Spring manufacturing facility"
          className="w-full h-full object-cover object-center"
          style={{ opacity: 1 }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, rgba(2,29,71,0.92) 0%, rgba(3,29,74,0.80) 50%, rgba(8,20,42,0.88) 100%)",
          }}
        />
      </div>

      {/* Dot grid */}
      <div
        className="absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
        }}
      />

      {/* Diagonal light streak */}
      <div
        className="absolute top-[10%] right-[18%] w-[2px] h-[50%] z-[1]"
        style={{
          background:
            "linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)",
          transform: "rotate(18deg)",
        }}
      />

      {/* Radial glow orb */}
      <motion.div
        animate={{ scale: [1, 1.18, 1], opacity: [0.18, 0.32, 0.18] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute right-[6%] top-[18%] w-[460px] h-[460px] rounded-full z-[1]"
        style={{
          background:
            "radial-gradient(circle, rgba(192,200,216,0.14) 0%, transparent 70%)",
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between gap-10 pt-[72px]"
      >
        {/* Left content */}
        <div className="max-w-[620px]">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="inline-flex items-center gap-2.5 bg-white/7 border border-white/15 rounded-full px-5 py-2 mb-7"
          >
            <span className="w-2 h-2 rounded-full bg-silver-DEFAULT inline-block" />
            <span className="font-body text-[0.72rem] text-white/65 tracking-[0.18em] uppercase">
              Precision Manufacturing
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35 }}
            className="font-display text-[clamp(3rem,5.5vw,5rem)] font-bold text-white leading-[1.06] mb-5"
          >
            Engineering
            <br />
            <span className="text-silver-light">Every Coil.</span>
            <br />
            <span className="text-[0.6em] text-white/40 italic font-normal">
              Precision Born. 
              <span className="block">Industry Proven.</span>
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
            className="font-body text-[1.05rem] text-white/50 leading-[1.85] max-w-[480px] mb-10"
          >
            Strengthening Industry with Indonesian-Made Precision Springs.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="flex gap-4 flex-wrap"
          >
            <motion.a
              href="#products"
              whileHover={{
                scale: 1.04,
                boxShadow: "0 0 28px rgba(192,200,216,0.35)",
              }}
              whileTap={{ scale: 0.97 }}
              className="bg-white text-[#021d47] px-8 py-3.5 rounded font-body font-bold text-[0.88rem] tracking-[0.08em] uppercase no-underline"
            >
              Explore Products
            </motion.a>
            <motion.a
              href="#gallery"
              whileHover={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              className="border border-white/25 text-white px-8 py-3.5 rounded font-body font-medium text-[0.88rem] tracking-[0.08em] uppercase no-underline transition-colors"
            >
              View Gallery
            </motion.a>
          </motion.div>
        </div>

        {/* Spring illustration */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.4 }}
          className="hidden lg:block w-[155px] h-[390px] flex-shrink-0"
        >
          <SpringSVG color="rgba(255,255,255,0.7)" className="w-full h-full" />
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.2, repeat: Infinity }}
        className="absolute bottom-7 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-20"
      >
        <span className="font-body text-[0.67rem] text-white/30 tracking-[0.15em] uppercase">
          Scroll
        </span>
        <div
          className="w-px h-9"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.6), transparent)",
          }}
        />
      </motion.div>
    </section>
  );
}