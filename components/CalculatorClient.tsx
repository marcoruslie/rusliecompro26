"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Calculator,
  Ruler,
  Circle,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  Scale,
  Banknote,
  Layers,
  Settings2,
  WavesIcon,
  RefreshCw,
  Home,
  MessageCircle,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
interface FormState {
  wireDiameter: string;
  innerDiameter: string;
  length: string;
  constant: string;
  pitch: string;
  coils: string;
}

interface Result {
  weight: number;
  priceSteel: number;
  priceStainless: number;
  resolvedCoils: number;
  resolvedPitch: number;
  wireLengthPerCoil: number;
  totalWireLength: number;
  outerDiameter: number;
}

/* ─── Field meta ─────────────────────────────────────────────────── */
const FIELDS: {
  key: keyof FormState;
  label: string;
  placeholder: string;
  unit: string;
  required: boolean;
  icon: React.ReactNode;
  hint?: string;
}[] = [
  {
    key: "wireDiameter",
    label: "Diameter Kawat",
    placeholder: "Contoh: 0.8",
    unit: "mm",
    required: true,
    icon: <Ruler size={16} />,
  },
  {
    key: "innerDiameter",
    label: "Diameter Dalam",
    placeholder: "Contoh: 14",
    unit: "mm",
    required: true,
    icon: <Circle size={16} />,
  },
  {
    key: "length",
    label: "Panjang",
    placeholder: "Contoh: 50",
    unit: "mm",
    required: true,
    icon: <Ruler size={16} />,
  },
  {
    key: "constant",
    label: "Konstanta",
    placeholder: "Nilai konstanta",
    unit: "×",
    required: true,
    icon: <Settings2 size={16} />,
  },
  {
    key: "pitch",
    label: "Jarak Lilitan / Pitch",
    placeholder: "Contoh: 3.5",
    unit: "mm",
    required: false,
    icon: <WavesIcon size={16} />,
    hint: "Opsional",
  },
  {
    key: "coils",
    label: "Jumlah Lilitan",
    placeholder: "Auto-hitung jika kosong",
    unit: "buah",
    required: false,
    icon: <RefreshCw size={16} />,
    hint: "Opsional",
  },
];

/* ─── Calculation logic (ported 1-to-1 from Vue) ─────────────────── */
function runCalculation(raw: FormState): Result | null {
  const wireDiameter = parseFloat(raw.wireDiameter);
  const innerDiameter = parseFloat(raw.innerDiameter);
  const length = parseFloat(raw.length);
  const constant = parseFloat(raw.constant);

  if (
    isNaN(wireDiameter) ||
    isNaN(innerDiameter) ||
    isNaN(length) ||
    isNaN(constant) ||
    wireDiameter <= 0 ||
    innerDiameter <= 0 ||
    length <= 0 ||
    constant <= 0
  )
    return null;

  // outer diameter
  const outerDiameter = innerDiameter + wireDiameter * 2;

  // volume per mm of wire  (π r² × density)
  const volume = Math.PI * Math.pow(wireDiameter / 2, 2) * 7.89;

  // wire length per coil (ceil)
  const wireLengthPerCoil = Math.ceil(Math.PI * outerDiameter);

  // resolve coils
  let resolvedCoils: number;
  let resolvedPitch: number;

  const rawCoils = parseFloat(raw.coils);
  const rawPitch = parseFloat(raw.pitch);

  if (!raw.coils || isNaN(rawCoils) || rawCoils === 0) {
    if (!raw.pitch || isNaN(rawPitch) || rawPitch === 0) {
      resolvedPitch = wireDiameter;
      resolvedCoils = Math.ceil(length / (2 * wireDiameter));
    } else {
      resolvedPitch = rawPitch;
      resolvedCoils = Math.ceil(length / rawPitch);
    }
  } else {
    resolvedCoils = rawCoils;
    resolvedPitch = isNaN(rawPitch) || rawPitch === 0 ? wireDiameter : rawPitch;
  }

  const totalWireLength = resolvedCoils * wireLengthPerCoil;

  // weight in grams
  const totalWeight = (totalWireLength / 1000) * volume;

  if (!totalWeight || totalWeight <= 0) return null;

  const pricePerKgSteel = 90;
  const pricePerKgStainless = 180;

  return {
    weight: totalWeight,
    priceSteel: Math.ceil(totalWeight * pricePerKgSteel * constant),
    priceStainless: Math.ceil(totalWeight * pricePerKgStainless * constant),
    resolvedCoils,
    resolvedPitch,
    wireLengthPerCoil,
    totalWireLength,
    outerDiameter,
  };
}

/* ─── Number formatter ───────────────────────────────────────────── */
const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

/* ─── Spring coil animation ─────────────────────────────────────── */
function SpringCoilDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 200"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <motion.ellipse
          key={i}
          cx="40"
          cy={20 + i * 26}
          rx="30"
          ry="7"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="2"
          fill="none"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.3 + i * 0.08, duration: 0.4 }}
        />
      ))}
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────────────────── */
export default function CalculatorClient() {
  const [form, setForm] = useState<FormState>({
    wireDiameter: "",
    innerDiameter: "",
    length: "",
    constant: "",
    pitch: "",
    coils: "",
  });
  const [result, setResult] = useState<Result | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [loading, setLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // load Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }, []);

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    const required: (keyof FormState)[] = ["wireDiameter", "innerDiameter", "length", "constant"];
    required.forEach((k) => {
      const v = parseFloat(form[k]);
      if (!form[k] || isNaN(v) || v <= 0)
        newErrors[k] = "Wajib diisi dengan nilai positif";
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 400)); // micro-delay for animation feel

    const res = runCalculation(form);
    setResult(res);
    setLoading(false);

    setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  function handleReset() {
    setForm({ wireDiameter: "", innerDiameter: "", length: "", constant: "", pitch: "", coils: "" });
    setResult(null);
    setErrors({});
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: "#f5f7fa" }}
    >
      {/* ── NAVBAR ───────────────────────────────────────────────── */}
      <motion.nav
        initial={{ y: -70 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 lg:px-10 h-[68px]"
        style={{
          background: "rgba(2,29,71,0.97)",
          backdropFilter: "blur(14px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-base"
            style={{
              background: "#fff",
              color: "#021d47",
              fontFamily: "'Playfair Display', serif",
            }}
          >
            R
          </div>
          <span
            className="text-white font-bold text-[1.15rem] tracking-wide"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            RUSLIE <span className="text-gray-400">SPRING</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="hidden sm:flex items-center gap-1.5 text-white/60 hover:text-white text-[0.8rem] tracking-widest uppercase transition-colors"
          >
            <Home size={13} />
            Home
          </Link>
          <span className="text-white/20 hidden sm:block">|</span>
          <span
            className="flex items-center gap-1.5 text-white text-[0.8rem] tracking-widest uppercase"
          >
            <Calculator size={13} />
            Calculator
          </span>
        </div>
      </motion.nav>

      {/* ── HERO BANNER ──────────────────────────────────────────── */}
      <header
        className="relative overflow-hidden flex items-center pt-[68px]"
        style={{
          background: "linear-gradient(135deg, #021d47 0%, #031d4a 60%, #081428 100%)",
          minHeight: 260,
        }}
      >
        {/* dot grid */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.055) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        {/* glow */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.28, 0.15] }}
          transition={{ duration: 7, repeat: Infinity }}
          className="absolute right-[8%] top-1/2 -translate-y-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(192,200,216,0.18) 0%, transparent 70%)",
          }}
        />
        {/* decorative spring */}
        <SpringCoilDecor className="absolute right-[15%] top-1/2 -translate-y-1/2 w-16 h-32 opacity-70 hidden lg:block" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 lg:px-10 py-12 w-full">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.14)",
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white/60 inline-block" />
            <span className="text-white/60 text-[0.7rem] tracking-[0.18em] uppercase font-medium">
              Ruslie Spring Tools
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="text-white font-bold leading-[1.1] mb-3"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "clamp(1.9rem, 4vw, 2.9rem)",
            }}
          >
            Spring & Wire
            <br />
            <span className="text-gray-300">Price Calculator</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="text-white/45 text-[0.93rem] leading-relaxed max-w-md"
          >
            Masukkan data spesifikasi pegas untuk menghitung estimasi berat dan
            harga bahan (baja & stainless).
          </motion.p>
        </div>
      </header>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-10 py-10 pb-20">
        {/* ── FORM CARD ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{ border: "1px solid rgba(2,29,71,0.07)" }}
        >
          {/* Card header */}
          <div
            className="px-8 py-5 flex items-center gap-3"
            style={{
              borderBottom: "1px solid rgba(2,29,71,0.07)",
              background: "#f8fafc",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "#021d47" }}
            >
              <Calculator size={18} className="text-white" />
            </div>
            <div>
              <p
                className="font-bold text-[#021d47] text-[0.95rem]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Input Spesifikasi
              </p>
              <p className="text-[0.75rem] text-gray-400">
                Kolom bertanda * wajib diisi
              </p>
            </div>
          </div>

          {/* Form body */}
          <form onSubmit={handleCalculate} className="px-6 sm:px-8 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FIELDS.map((f, i) => (
                <motion.div
                  key={f.key}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.07 }}
                >
                  <label className="block text-[0.8rem] font-semibold text-[#021d47]/80 mb-1.5 tracking-wide">
                    {f.label}
                    {f.required && (
                      <span className="text-red-400 ml-0.5">*</span>
                    )}
                    {f.hint && (
                      <span className="text-gray-400 font-normal ml-1.5">
                        ({f.hint})
                      </span>
                    )}
                  </label>
                  <div className="relative">
                    {/* Icon */}
                    <div
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {f.icon}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, [f.key]: e.target.value }));
                        if (errors[f.key])
                          setErrors((p) => ({ ...p, [f.key]: undefined }));
                      }}
                      className="w-full pl-9 pr-14 py-3 rounded-xl text-[0.9rem] text-[#021d47] placeholder-gray-300 transition-all outline-none"
                      style={{
                        background: errors[f.key] ? "#fff5f5" : "#f8fafc",
                        border: errors[f.key]
                          ? "1.5px solid #f87171"
                          : "1.5px solid rgba(2,29,71,0.1)",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.border =
                          "1.5px solid rgba(2,29,71,0.45)";
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.boxShadow =
                          "0 0 0 3px rgba(2,29,71,0.07)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.border = errors[f.key]
                          ? "1.5px solid #f87171"
                          : "1.5px solid rgba(2,29,71,0.1)";
                        e.currentTarget.style.background = errors[f.key]
                          ? "#fff5f5"
                          : "#f8fafc";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    {/* Unit badge */}
                    <div
                      className="absolute right-0 top-0 bottom-0 flex items-center px-3.5 rounded-r-xl text-[0.75rem] font-semibold text-gray-400 border-l"
                      style={{ borderColor: "rgba(2,29,71,0.09)" }}
                    >
                      {f.unit}
                    </div>
                  </div>
                  <AnimatePresence>
                    {errors[f.key] && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="text-red-400 text-[0.75rem] mt-1.5 flex items-center gap-1"
                      >
                        ⚠ {errors[f.key]}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {/* Auto-calc note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 p-4 rounded-xl text-[0.78rem] text-gray-400 leading-relaxed"
              style={{
                background: "#f8fafc",
                border: "1px dashed rgba(2,29,71,0.12)",
              }}
            >
              <strong className="text-gray-500">ℹ️ Catatan:</strong> Jika
              jumlah lilitan tidak diisi atau bernilai 0, akan dihitung otomatis
              dari panjang ÷ pitch. Jika pitch juga kosong, diasumsikan{" "}
              <em>pitch = diameter kawat</em>.
            </motion.div>

            {/* Action buttons */}
            <div className="mt-8 flex gap-3 justify-center flex-wrap">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.03, boxShadow: "0 8px 24px rgba(2,29,71,0.25)" }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2.5 text-white font-semibold px-8 py-3.5 rounded-xl text-[0.88rem] tracking-wide transition-all"
                style={{
                  background: loading
                    ? "rgba(2,29,71,0.5)"
                    : "linear-gradient(135deg, #021d47 0%, #0a2a5e 100%)",
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw size={16} />
                    </motion.div>
                    Menghitung…
                  </>
                ) : (
                  <>
                    <Calculator size={16} />
                    Hitung Sekarang
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>

              {(result || Object.values(form).some(Boolean)) && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={handleReset}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-2 text-gray-500 font-medium px-6 py-3.5 rounded-xl text-[0.87rem] transition-all border"
                  style={{
                    background: "#f8fafc",
                    border: "1.5px solid rgba(2,29,71,0.12)",
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={15} />
                  Reset
                </motion.button>
              )}
            </div>
          </form>
        </motion.div>

        {/* ── RESULTS ──────────────────────────────────────────────── */}
        <AnimatePresence>
          {result && (
            <motion.div
              ref={resultRef}
              key="results"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
              className="mt-6"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 mb-5 px-1">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "#021d47" }}
                >
                  <Layers size={17} className="text-white" />
                </div>
                <div>
                  <p
                    className="font-bold text-[#021d47] text-[1rem]"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    Hasil Perhitungan
                  </p>
                  <p className="text-[0.75rem] text-gray-400">
                    Berdasarkan input yang Anda masukkan
                  </p>
                </div>
              </div>

              {/* Main price cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Weight */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="rounded-2xl p-6 flex flex-col gap-2"
                  style={{
                    background: "linear-gradient(135deg, #021d47 0%, #0d2a5a 100%)",
                    boxShadow: "0 8px 32px rgba(2,29,71,0.18)",
                  }}
                >
                  <div className="flex items-center gap-2 text-white/50 text-[0.72rem] uppercase tracking-widest mb-1">
                    <Scale size={13} />
                    Berat Pegas
                  </div>
                  <div
                    className="text-white text-[2rem] font-bold leading-none"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {result.weight.toFixed(2)}
                  </div>
                  <div className="text-white/40 text-[0.8rem]">gram</div>
                </motion.div>

                {/* Steel price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="rounded-2xl p-6 bg-white flex flex-col gap-2"
                  style={{
                    border: "1.5px solid rgba(2,29,71,0.1)",
                    boxShadow: "0 4px 20px rgba(2,29,71,0.07)",
                  }}
                >
                  <div className="flex items-center gap-2 text-gray-400 text-[0.72rem] uppercase tracking-widest mb-1">
                    <Banknote size={13} />
                    Harga Baja
                  </div>
                  <div
                    className="text-[#021d47] text-[1.55rem] font-bold leading-none"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {rupiah(result.priceSteel)}
                  </div>
                  <div className="text-gray-300 text-[0.75rem]">
                    @ Rp 90 / gram × konstanta
                  </div>
                </motion.div>

                {/* Stainless price */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.19 }}
                  className="rounded-2xl p-6 bg-white flex flex-col gap-2"
                  style={{
                    border: "1.5px solid rgba(2,29,71,0.1)",
                    boxShadow: "0 4px 20px rgba(2,29,71,0.07)",
                  }}
                >
                  <div className="flex items-center gap-2 text-gray-400 text-[0.72rem] uppercase tracking-widest mb-1">
                    <Banknote size={13} />
                    Harga Stainless
                  </div>
                  <div
                    className="text-[#021d47] text-[1.55rem] font-bold leading-none"
                    style={{ fontFamily: "'Playfair Display', serif" }}
                  >
                    {rupiah(result.priceStainless)}
                  </div>
                  <div className="text-gray-300 text-[0.75rem]">
                    @ Rp 180 / gram × konstanta
                  </div>
                </motion.div>
              </div>

              {/* Detail breakdown */}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1.5px solid rgba(2,29,71,0.08)" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("breakdown-body");
                    if (el) el.classList.toggle("hidden");
                    const icon = document.getElementById("breakdown-icon");
                    if (icon) icon.classList.toggle("rotate-180");
                  }}
                  className="w-full flex items-center justify-between px-6 py-4 text-left"
                  style={{ background: "#f8fafc", borderBottom: "1px solid rgba(2,29,71,0.07)" }}
                >
                  <span
                    className="font-semibold text-[#021d47] text-[0.88rem] flex items-center gap-2"
                  >
                    <Settings2 size={15} className="text-gray-400" />
                    Detail Kalkulasi
                  </span>
                  <ChevronDown
                    id="breakdown-icon"
                    size={16}
                    className="text-gray-400 transition-transform duration-300"
                  />
                </button>
                <div id="breakdown-body" className="hidden">
                  <div className="divide-y" style={{ divideColor: "rgba(2,29,71,0.06)" }}>
                    {[
                      {
                        label: "Diameter Luar (OD)",
                        value: `${result.outerDiameter.toFixed(2)} mm`,
                      },
                      {
                        label: "Panjang Kawat per Lilitan",
                        value: `${result.wireLengthPerCoil} mm`,
                      },
                      {
                        label: "Jumlah Lilitan (resolved)",
                        value: `${result.resolvedCoils} lilitan`,
                      },
                      {
                        label: "Pitch (resolved)",
                        value: `${result.resolvedPitch.toFixed(2)} mm`,
                      },
                      {
                        label: "Total Panjang Kawat",
                        value: `${result.totalWireLength.toFixed(1)} mm`,
                      },
                      {
                        label: "Berat Pegas",
                        value: `${result.weight.toFixed(4)} gram`,
                      },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex justify-between items-center px-6 py-3.5"
                      >
                        <span className="text-[0.83rem] text-gray-400">{row.label}</span>
                        <span
                          className="text-[0.88rem] font-semibold text-[#021d47]"
                          style={{ fontFamily: "'Playfair Display', serif" }}
                        >
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer
        className="text-white text-center py-6 text-[0.8rem] px-4"
        style={{ background: "#021d47" }}
      >
        <p className="text-white/50">
          © {new Date().getFullYear()}{" "}
          <span
            className="text-white/80"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Ruslie Spring
          </span>
          . All rights reserved.
        </p>
      </footer>

      {/* ── WHATSAPP BUTTON ──────────────────────────────────────── */}
      <motion.a
        href="https://wa.me/6285104815151"
        target="_blank"
        rel="noopener noreferrer"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, type: "spring", stiffness: 200 }}
        whileHover={{ scale: 1.1, boxShadow: "0 8px 30px rgba(34,197,94,0.45)" }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full text-white shadow-xl"
        style={{ background: "#22c55e" }}
        title="Chat via WhatsApp"
      >
        <MessageCircle size={24} fill="white" strokeWidth={0} />
      </motion.a>
    </div>
  );
}
