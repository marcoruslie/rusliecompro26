"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/i18n";
import LanguageSwitcher from "./LanguageSwitcher";
import { useScrollStage } from "@/lib/scrollStage";

const NAV_HREFS = [
  "#about",
  "#process",
  "#products",
  "#capabilities",
  "#gallery",
  "#contact",
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
  const navLinks = NAV_HREFS.map((href, i) => ({
    href,
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
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-colors duration-300 ${
          scrolled
            ? "border-b border-rule bg-ground/90 backdrop-blur-md"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-3">
            {/* next/image serves a ~96px WebP instead of the 128KB 1024px source PNG */}
            <Image
              src="/Logo_Ruslie_Spring.png"
              alt="Ruslie Spring"
              width={96}
              height={96}
              priority
              className="h-auto w-24 object-contain"
            />
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={onNavClick(link.href)}
                className="group relative font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ink-soft transition-colors duration-200 hover:text-navy"
              >
                {link.label}
                <span className="absolute -bottom-1.5 left-0 h-px w-0 bg-navy transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
            <LanguageSwitcher />
            <a
              href="#contact"
              onClick={onNavClick("#contact")}
              className="rounded-plate bg-navy px-4 py-2 font-mono text-[0.72rem] font-medium uppercase tracking-[0.16em] text-white transition-colors duration-200 hover:bg-navy-hover"
            >
              {t.nav.getQuote}
            </a>
          </div>

          <div className="flex items-center gap-4 md:hidden">
            <LanguageSwitcher />
            <button
              className="p-1 text-ink"
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
          className="h-px w-full origin-left bg-navy"
        />
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22 }}
            className="fixed left-0 right-0 top-[69px] z-40 border-b border-rule bg-ground md:hidden"
          >
            <div className="flex flex-col gap-5 px-6 py-6">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    onNavClick(link.href)(e);
                    setMenuOpen(false);
                  }}
                  className="font-mono text-sm uppercase tracking-[0.16em] text-ink-soft transition-colors hover:text-navy"
                >
                  {link.label}
                </a>
              ))}
              <a
                href="#contact"
                onClick={(e) => {
                  onNavClick("#contact")(e);
                  setMenuOpen(false);
                }}
                className="mt-2 rounded-plate bg-navy py-3 text-center font-mono text-sm font-medium uppercase tracking-[0.16em] text-white"
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
