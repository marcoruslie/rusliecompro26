"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useReducedMotion,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
} from "framer-motion";

const PARALLAX = [30, 56, 22, 44];
import {
  ArrowDownUp,
  MoveVertical,
  RotateCw,
  Spline,
  Activity,
  BatteryCharging,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";
import { SectionIndex, CornerBrackets } from "./hud";

type Product = {
  name: string;
  desc: string;
  icon: LucideIcon;
  tag: string;
  span: string;
};

const PRODUCTS: Product[] = [
  {
    name: "Compression Springs",
    desc: "High-load bearing springs for industrial machinery and automotive systems.",
    icon: ArrowDownUp,
    tag: "Push",
    span: "lg:col-span-2",
  },
  {
    name: "Extension Springs",
    desc: "Precision-engineered for consistent tension in heavy-duty applications.",
    icon: MoveVertical,
    tag: "Pull",
    span: "",
  },
  {
    name: "Torsion Springs",
    desc: "Custom torque solutions for machinery and manufacturing.",
    icon: RotateCw,
    tag: "Torque",
    span: "",
  },
  {
    name: "Wire Forms",
    desc: "Complex custom wire shapes engineered to exact client specifications.",
    icon: Spline,
    tag: "Custom",
    span: "",
  },
  {
    name: "Zigzag Springs",
    desc: "Durable zigzag springs for furniture seating — long-lasting support and elasticity.",
    icon: Activity,
    tag: "Seating",
    span: "",
  },
  {
    name: "Battery Springs",
    desc: "Reliable electrical contact for battery compartments and electronic assemblies.",
    icon: BatteryCharging,
    tag: "Contact",
    span: "lg:col-span-2",
  },
];

function ProductCard({ p, index }: { p: Product; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-12% 0px" });
  const Icon = p.icon;

  // Pointer position (0..1) drives 3D tilt + the spotlight.
  // Continuous scroll-linked parallax drift (column-varied speed).
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const mag = PARALLAX[index % PARALLAX.length];
  const py = useTransform(scrollYProgress, [0, 1], [mag, -mag]);

  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [7, -7]), {
    stiffness: 150,
    damping: 16,
  });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-7, 7]), {
    stiffness: 150,
    damping: 16,
  });
  const spotX = useTransform(mx, (v) => `${v * 100}%`);
  const spotY = useTransform(my, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(240px circle at ${spotX} ${spotY}, rgba(34,211,238,0.16), transparent 68%)`;

  function onMove(e: React.MouseEvent) {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      className={p.span}
      style={{ perspective: 1000, y: reduce ? 0 : py }}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 36, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : undefined}
        transition={{ type: "spring", stiffness: 90, damping: 18, delay: index * 0.07 }}
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="group relative h-full min-h-[200px] rounded-xl border border-white/[0.08] bg-steel-700/30 p-7 overflow-hidden transition-colors duration-300 hover:border-cyan/40"
      >
        {/* faint blueprint texture, brightens on hover */}
        <div className="absolute inset-0 bg-dot-cyan [background-size:22px_22px] opacity-20 group-hover:opacity-40 transition-opacity duration-500 pointer-events-none" />
        {/* cursor-follow spotlight */}
        <motion.div
          aria-hidden
          style={{ background: spotlight }}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          <CornerBrackets />
        </div>

        <div className="relative flex items-start justify-between mb-5">
          <div className="w-12 h-12 rounded-lg bg-cyan/10 border border-cyan/25 flex items-center justify-center transition-all duration-300 group-hover:bg-cyan/20 group-hover:scale-110 group-hover:-rotate-6">
            <Icon size={22} className="text-cyan" />
          </div>
          <span className="font-mono text-[0.66rem] text-hud-mute tracking-[0.16em] border border-white/10 rounded px-2 py-1 group-hover:text-cyan group-hover:border-cyan/30 transition-colors">
            {p.tag}
          </span>
        </div>

        <h3 className="relative font-tech text-[1.1rem] font-semibold text-hud-silver mb-2.5">
          {p.name}
        </h3>
        <p className="relative font-body text-[0.86rem] text-hud-silver/50 leading-[1.7] max-w-[42ch]">
          {p.desc}
        </p>

        <div className="relative mt-5 flex items-center justify-between">
          <div className="h-0.5 w-8 bg-cyan/50 rounded-full transition-all duration-300 group-hover:w-16" />
          <span className="flex items-center gap-1 font-mono text-[0.62rem] tracking-[0.16em] uppercase text-cyan opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
            Detail
            <ArrowUpRight size={13} />
          </span>
        </div>

        {/* index watermark */}
        <span className="absolute bottom-4 right-5 font-tech font-bold text-[2.4rem] leading-none text-white/[0.03] group-hover:text-cyan/10 transition-colors duration-300 pointer-events-none select-none">
          {String(index + 1).padStart(2, "0")}
        </span>
      </motion.div>
    </motion.div>
  );
}

export default function Products() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section
      id="products"
      ref={ref}
      className="relative bg-carbon py-[120px] px-6 lg:px-10 overflow-hidden border-t border-white/[0.06]"
    >
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div style={{ y: headerY }} className="mb-14">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <SectionIndex index="03" label="What We Make" className="mb-6" />
            <h2 className="font-tech font-bold text-[clamp(2rem,4vw,3rem)] text-hud-silver">
              The <span className="text-cyan hud-glow-cyan">Spring Catalog</span>
            </h2>
          </motion.div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PRODUCTS.map((p, i) => (
            <ProductCard key={p.name} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
