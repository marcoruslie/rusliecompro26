"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { useScrollStage } from "@/lib/scrollStage";

const NAV_META = [
  { href: "#about", n: "01" },
  { href: "#process", n: "02" },
  { href: "#products", n: "03" },
  { href: "#capabilities", n: "04" },
  { href: "#gallery", n: "05" },
  { href: "#contact", n: "06" },
];

export default function Navbar() {
  const { t } = useLanguage();
  const { stageEnabled, sections, goTo, globalProgress } = useScrollStage();
  const indexOf = (href: string) =>
    sections.findIndex((s) => `#${s.id}` === href);
  const onNavClick = (href: string) => (e: React.MouseEvent) => {
    if (!stageEnabled) return; // native hash scroll
    const i = indexOf(href);
    if (i >= 0) {
      e.preventDefault();
      goTo(i);
    }
  };
  const navLinks = NAV_META.map((meta, i) => ({
    ...meta,
    label: t.nav.links[i],
  }));
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    restDelta: 0.001,
  });
  // In stage mode the document doesn't scroll; drive the hairline from deck progress.
  const barProgress = stageEnabled ? globalProgress : progress;

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
                onClick={onNavClick(link.href)}
                className="group relative font-mono text-[0.74rem] tracking-[0.18em] uppercase text-hud-silver/55 hover:text-cyan transition-colors duration-200"
              >
                <span className="text-cyan/40 mr-1.5 text-[0.62rem] align-top">
                  {link.n}
                </span>
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-cyan transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <LanguageSwitcher />
            <a
              href="#contact"
              onClick={onNavClick("#contact")}
              className="relative font-mono text-[0.74rem] font-medium tracking-[0.16em] uppercase text-graphite bg-cyan px-4 py-2 rounded hover:shadow-cyan-glow transition-shadow duration-300"
            >
              {t.nav.getQuote}
            </a>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <LanguageSwitcher />
            <button
              className="text-hud-silver p-1"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Scroll-progress hairline */}
        <motion.div
          aria-hidden
          style={{ scaleX: barProgress }}
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
                  onClick={(e) => {
                    onNavClick(link.href)(e);
                    setMenuOpen(false);
                  }}
                  className="font-mono text-sm tracking-[0.16em] uppercase text-hud-silver/70 hover:text-cyan transition-colors"
                >
                  <span className="text-cyan/40 mr-2 text-xs">{link.n}</span>
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={(e) => {
                  onNavClick("#contact")(e);
                  setMenuOpen(false);
                }}
                className="bg-cyan text-graphite text-center py-3 rounded font-mono font-medium text-sm tracking-[0.16em] uppercase mt-2"
              >
                {t.nav.getQuote}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
