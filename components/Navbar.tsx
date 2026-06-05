"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/components/LanguageProvider";
import { LANGS } from "@/lib/i18n";

const NAV_META = [
  { href: "#about", n: "01" },
  { href: "#process", n: "02" },
  { href: "#products", n: "03" },
  { href: "#capabilities", n: "04" },
  { href: "#gallery", n: "05" },
  { href: "#contact", n: "06" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const { lang, setLang, tr } = useLanguage();
  const navLinks = NAV_META.map((m, i) => ({ ...m, label: tr.nav.links[i] }));
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -90 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-500 ${
          scrolled
            ? "bg-graphite/85 backdrop-blur-xl border-b border-white/[0.06]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-[68px]">
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/Logo_Ruslie_Spring.png"
              alt="Ruslie Spring"
              className="h-auto w-24 object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="group relative font-mono text-[0.74rem] tracking-[0.18em] uppercase text-hud-silver/55 hover:text-cyan transition-colors duration-200"
              >
                <span className="text-cyan/40 mr-1.5 text-[0.62rem] align-top">
                  {link.n}
                </span>
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-cyan transition-all duration-300 group-hover:w-full" />
              </a>
            ))}

            {/* Language toggle */}
            <div className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLang(l.code)}
                  aria-pressed={lang === l.code}
                  className={`px-2.5 py-1 rounded-full font-mono text-[0.66rem] tracking-[0.08em] uppercase transition-colors duration-200 ${
                    lang === l.code
                      ? "bg-cyan text-graphite"
                      : "text-hud-silver/55 hover:text-cyan"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <a
              href="#contact"
              className="relative font-mono text-[0.74rem] font-medium tracking-[0.16em] uppercase text-graphite bg-cyan px-4 py-2 rounded hover:shadow-cyan-glow transition-shadow duration-300"
            >
              {tr.nav.getQuote}
            </a>
          </div>

          <button
            className="md:hidden text-hud-silver p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Scroll-progress hairline */}
        <motion.div
          aria-hidden
          style={{ scaleX: progress }}
          className="origin-left h-px w-full bg-gradient-to-r from-cyan via-cyan/70 to-transparent"
        />
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-[69px] left-0 right-0 z-40 bg-graphite/97 backdrop-blur-xl border-b border-white/10 md:hidden"
          >
            <div className="flex flex-col px-6 py-6 gap-5">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="font-mono text-sm tracking-[0.16em] uppercase text-hud-silver/70 hover:text-cyan transition-colors"
                >
                  <span className="text-cyan/40 mr-2 text-xs">{link.n}</span>
                  {link.label}
                </a>
              ))}

              {/* Language toggle (mobile) */}
              <div className="flex items-center gap-1.5 mt-1">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code)}
                    aria-pressed={lang === l.code}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs tracking-[0.08em] uppercase border transition-colors ${
                      lang === l.code
                        ? "bg-cyan text-graphite border-cyan"
                        : "text-hud-silver/60 border-white/15 hover:text-cyan"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>

              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="bg-cyan text-graphite text-center py-3 rounded font-mono font-medium text-sm tracking-[0.16em] uppercase mt-2"
              >
                {tr.nav.getQuote}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
