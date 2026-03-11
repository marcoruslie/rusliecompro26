"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const CAPS = [
  { label: "Wire Diameter", value: "0.1mm – 50mm" },
  { label: "Spring OD", value: "1mm – 500mm" },
  { label: "Free Length", value: "Up to 1500mm" },
  { label: "Tolerances", value: "±0.01mm achievable" },
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

  return (
    <section
      id="capabilities"
      ref={ref}
      className="bg-[#f5f7fa] py-[120px] px-6 lg:px-10"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="mb-14"
        >
          <p className="font-body text-[0.72rem] text-[#021d47]/55 tracking-[0.25em] uppercase mb-3">
            Technical Specs
          </p>
          <h2 className="font-display text-[clamp(2rem,3.5vw,3rem)] font-bold text-[#021d47]">
            Manufacturing{" "}
            <span className="text-steel-DEFAULT">Capabilities</span>
          </h2>
        </motion.div>

        {/* Specs table */}
        <div className="border border-[#021d47]/10 rounded-2xl overflow-hidden mb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {CAPS.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, x: i % 2 === 0 ? -24 : 24 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.55, delay: i * 0.09 }}
                className={`flex justify-between items-center px-8 py-7 ${
                  i < 4 ? "border-b border-[#021d47]/8" : ""
                } ${i % 2 === 0 ? "sm:border-r border-[#021d47]/8 bg-white" : "bg-[#f5f7fa]"}`}
              >
                <span className="font-body text-steel-light text-[0.87rem] uppercase tracking-[0.08em]">
                  {c.label}
                </span>
                <span className="font-display text-[#021d47] text-[1.08rem] font-bold">
                  {c.value}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Industries */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.45 }}
        >
          <p className="font-body text-[0.72rem] text-steel-light tracking-[0.2em] uppercase mb-5">
            Industries We Serve
          </p>
          <div className="flex flex-wrap gap-2.5">
            {INDUSTRIES.map((ind, i) => (
              <motion.span
                key={ind}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: 0.5 + i * 0.05 }}
                whileHover={{
                  backgroundColor: "#021d47",
                  color: "#ffffff",
                  borderColor: "#021d47",
                }}
                className="font-body text-[0.82rem] text-[#021d47] border-[1.5px] border-[#021d47]/20 rounded-full px-5 py-2 cursor-default transition-all duration-250 bg-white tracking-[0.04em]"
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
