"use client";

import { motion } from "framer-motion";

interface SpringSVGProps {
  color?: string;
  className?: string;
}

export default function SpringSVG({
  color = "#ffffff",
  className = "",
}: SpringSVGProps) {
  return (
    <svg
      viewBox="0 0 120 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <motion.ellipse
          key={i}
          cx="60"
          cy={30 + i * 28}
          rx="45"
          ry="10"
          stroke={color}
          strokeWidth="3"
          fill="none"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: i * 0.09, duration: 0.5, ease: "easeOut" }}
        />
      ))}
      <motion.line
        x1="15" y1="30" x2="15" y2="252"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.25"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.3 }}
      />
      <motion.line
        x1="105" y1="30" x2="105" y2="252"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.25"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.3 }}
      />
    </svg>
  );
}
