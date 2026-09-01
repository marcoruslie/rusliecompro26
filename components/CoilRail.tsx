"use client";

/* ─────────────────────────────────────────────────────────────
   Coil rail — the page's scroll indicator.

   A compression spring drawn as a true 3D helix: every segment is
   perspective-projected, so the coils in front are wider apart,
   thicker and darker than the ones passing behind. Scrolling loads
   it. The coil deflects against a fixed graduated rule and the
   readout reports the deflection in millimetres, which is how a
   spring is actually specified.

   The geometry is computed once and compression is applied as a
   single GPU-composited scaleY, so the whole thing costs one
   transform per frame regardless of segment count.
   ───────────────────────────────────────────────────────────── */

import { memo, useEffect, useMemo, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useReducedMotion,
  useMotionValueEvent,
  type MotionValue,
} from "framer-motion";

// Drawing frame
const W = 64;
const H = 420;
const CX = W / 2;

// Helix
const TOP = 34; // free-length top, under the load plate
const BOT = 372; // seated on the base plate
const RADIUS = 19;
const TURNS = 9;
const SEGMENTS = 150;
// How far above the coil axis the viewer sits. Each turn projects to an
// ellipse whose minor axis is TILT × RADIUS, which is what gives the
// depth read. Kept well under the coil pitch so turns never cross.
const TILT = 0.5;

// Spec — free length and the deflection at full page scroll
const FREE_LENGTH = 180;
const MAX_DEFLECTION = 99;
const COMPRESSED = 1 - MAX_DEFLECTION / FREE_LENGTH; // scaleY at full load

type Seg = { x1: number; y1: number; x2: number; y2: number; w: number; o: number };

/** Project one point on the helix, viewed slightly from above. */
function project(t: number) {
  const a = t * TURNS * Math.PI * 2;
  const z = Math.cos(a); // −1 = far side, +1 = near side
  return {
    x: CX + RADIUS * Math.sin(a),
    // The near side of each turn sits lower on screen than the far side.
    y: TOP + t * (BOT - TOP) + TILT * RADIUS * z,
    z,
  };
}

function buildHelix(): Seg[] {
  const segs: Seg[] = [];
  let prev = project(0);
  for (let i = 1; i <= SEGMENTS; i++) {
    const cur = project(i / SEGMENTS);
    // Nearer wire reads thicker and darker; the far side falls back.
    const k = ((prev.z + cur.z) / 2 + 1) / 2; // 0 at the back, 1 at the front
    segs.push({
      x1: prev.x,
      y1: prev.y,
      x2: cur.x,
      y2: cur.y,
      w: 1.3 + k * 1.6,
      o: 0.2 + k * 0.62,
    });
    prev = cur;
  }
  return segs;
}

/* The wire itself never changes shape — only the group's scaleY does — so
   the 150 segments are built once and kept as a stable element array. Without
   this they re-reconcile on every scroll frame and saturate the main thread. */
const WireGeometry = memo(function WireGeometry() {
  const segments = useMemo(buildHelix, []);
  return (
    <>
      {segments.map((s, i) => (
        <line
          key={i}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke="#16181c"
          strokeOpacity={s.o}
          strokeWidth={s.w}
          strokeLinecap="round"
        />
      ))}
    </>
  );
});

/* The readout is the only part that re-renders as you scroll, so it owns the
   state on its own rather than re-rendering the whole rail. */
function Readout({ load }: { load: MotionValue<number> }) {
  const [mm, setMm] = useState(0);
  useMotionValueEvent(load, "change", (v) => {
    setMm(Math.round(Math.min(1, Math.max(0, v)) * MAX_DEFLECTION));
  });

  return (
    <div className="mt-3 w-[110px] whitespace-nowrap pl-1 font-mono text-[0.56rem] leading-[1.5] tracking-[0.12em] text-ink-faint">
      <div className="text-navy">
        &Delta; {mm.toString().padStart(2, "0")}.0 mm
      </div>
      <div>L₀ {FREE_LENGTH} mm</div>
    </div>
  );
}

export default function CoilRail() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const load = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 24,
    restDelta: 0.001,
  });

  // Deflection: the coil seats on the base and shortens under load.
  const scaleY = useTransform(load, [0, 1], [1, COMPRESSED]);
  const plateY = useTransform(load, [0, 1], [0, (BOT - TOP) * MAX_DEFLECTION / FREE_LENGTH]);

  // The Process section runs its own full-scale coil, so the rail stands
  // down while that section holds the viewport and returns afterwards.
  const [handoff, setHandoff] = useState(false);
  useEffect(() => {
    const el = document.getElementById("process");
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => setHandoff(e.isIntersecting),
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (reduce) return null;

  return (
    <motion.div
      aria-hidden
      animate={{ opacity: handoff ? 0 : 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="pointer-events-none fixed left-5 top-1/2 z-30 hidden -translate-y-1/2 xl:block"
      style={{ width: W, height: H }}
    >
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
        {/* Graduated rule — the fixed reference the coil deflects against */}
        <line x1={2} y1={TOP} x2={2} y2={BOT} stroke="#16181c" strokeOpacity={0.16} strokeWidth={1} />
        {Array.from({ length: 11 }).map((_, i) => {
          const y = TOP + (i / 10) * (BOT - TOP);
          const major = i % 5 === 0;
          return (
            <line
              key={i}
              x1={2}
              y1={y}
              x2={major ? 10 : 6}
              y2={y}
              stroke="#16181c"
              strokeOpacity={major ? 0.28 : 0.14}
              strokeWidth={1}
            />
          );
        })}

        {/* Load plate — travels down by exactly the deflection */}
        <motion.g style={{ y: plateY }}>
          <line
            x1={CX - RADIUS - 5}
            y1={TOP - 6}
            x2={CX + RADIUS + 5}
            y2={TOP - 6}
            stroke="#021d47"
            strokeWidth={2.5}
            strokeLinecap="square"
          />
        </motion.g>

        {/* The helix. Anchored at the base so load shortens it upward. */}
        <motion.g
          style={{ scaleY, originY: `${BOT}px`, originX: `${CX}px` }}
        >
          <WireGeometry />
        </motion.g>

        {/* Base plate — fixed */}
        <line
          x1={CX - RADIUS - 5}
          y1={BOT + 6}
          x2={CX + RADIUS + 5}
          y2={BOT + 6}
          stroke="#16181c"
          strokeOpacity={0.5}
          strokeWidth={2.5}
          strokeLinecap="square"
        />
      </svg>

      <Readout load={load} />
    </motion.div>
  );
}
