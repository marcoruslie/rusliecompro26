"use client";

import {
  motion,
  useReducedMotion,
  useSpring,
  useTransform,
  useMotionValue,
  type MotionValue,
} from "framer-motion";

/* Flat blueprint-style spring for the Hero. Steel coils + cyan
   measurement annotations. Draws in on mount, idle-floats, and
   compresses within the fixed rails as the page scrolls — no rotation. */
export default function HeroSpring({
  coils = 8,
  progress,
  className = "",
}: {
  coils?: number;
  progress?: MotionValue<number>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const top = 40;
  const bottom = 300;
  const gap = (bottom - top) / coils;
  const rows = Array.from({ length: coils + 1 });

  // Scroll-driven compression of the coil stack (squeeze, never flatten).
  const fallback = useMotionValue(0);
  const smooth = useSpring(progress ?? fallback, {
    stiffness: 90,
    damping: 22,
    restDelta: 0.001,
  });
  const scaleY = useTransform(smooth, [0, 1], [1, 0.52]);
  const glow = useTransform(smooth, [0, 1], [0.22, 0.6]);

  return (
    <svg
      viewBox="0 0 160 340"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="heroSteel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#dbe2ee" />
          <stop offset="50%" stopColor="#aeb6c2" />
          <stop offset="100%" stopColor="#5a6470" />
        </linearGradient>
        <filter id="heroSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      {/* Cyan measurement rails + end ticks (fixed reference frame) */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9 }}
      >
        <line x1="24" y1={top - 4} x2="24" y2={bottom + 4} stroke="#22d3ee" strokeOpacity="0.22" />
        <line x1="136" y1={top - 4} x2="136" y2={bottom + 4} stroke="#22d3ee" strokeOpacity="0.22" />
        {[top, bottom].map((yy, k) => (
          <g key={k}>
            <line x1="18" y1={yy} x2="24" y2={yy} stroke="#22d3ee" strokeOpacity="0.45" />
            <line x1="136" y1={yy} x2="142" y2={yy} stroke="#22d3ee" strokeOpacity="0.45" />
          </g>
        ))}
      </motion.g>

      {/* Compression glow band that intensifies as coils squeeze */}
      <motion.ellipse
        cx="80"
        cy={bottom}
        rx="50"
        ry="13"
        fill="#22d3ee"
        style={{ opacity: glow }}
        filter="url(#heroSoft)"
      />

      {/* Coil stack — idle float + scroll-driven vertical compression */}
      <motion.g
        animate={reduce ? undefined : { y: [0, -6, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          scaleY: reduce ? 1 : scaleY,
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
        filter="url(#heroSoft)"
      >
        {rows.map((_, i) => (
          <motion.ellipse
            key={i}
            cx="80"
            cy={top + i * gap}
            rx="46"
            ry="11"
            stroke="url(#heroSteel)"
            strokeWidth="2.6"
            fill="none"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ delay: i * 0.07, duration: 0.5, ease: "easeOut" }}
            style={{ transformOrigin: "80px 50%" }}
          />
        ))}
      </motion.g>
    </svg>
  );
}
