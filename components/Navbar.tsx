"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import Link from "next/link";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Products", href: "#products" },
  { label: "Gallery", href: "#gallery" },
  { label: "Capabilities", href: "#capabilities" },
  { label: "Contact", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <motion.nav
        initial={{ y: -90 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-[#021d47]/95 backdrop-blur-xl border-b border-white/8 shadow-2xl shadow-[#021d47]/50"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10 flex items-center justify-between h-[72px]">
          <Link href="/" className="flex items-center gap-3 group">
            
            {/* Add icon from Logo_Ruslie_Spring.png make size fit the navbar*/}
            <img src="/Logo_Ruslie_Spring.png" alt="Ruslie Spring" className="h-auto w-24 object-contain" />
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-white/65 hover:text-white font-body text-[0.8rem] tracking-widest uppercase transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
            {/* Tool links */}
            {/* <div className="flex items-center gap-2 ml-1">
              <Link
                href="/calculator"
                className="flex items-center gap-1 bg-white/8 hover:bg-white/14 border border-white/15 text-white/80 hover:text-white text-[0.75rem] tracking-wider uppercase transition-all duration-200 px-3 py-1.5 rounded-lg"
              >
                🧮 Calc
              </Link>
              <Link
                href="/invoice"
                className="flex items-center gap-1 bg-white/8 hover:bg-white/14 border border-white/15 text-white/80 hover:text-white text-[0.75rem] tracking-wider uppercase transition-all duration-200 px-3 py-1.5 rounded-lg"
              >
                🧾 Invoice
              </Link>
            </div> */}
            <a
              href="#contact"
              className="bg-white text-[#021d47] px-4 py-2 rounded font-body text-[0.78rem] font-semibold tracking-widest uppercase hover:bg-gray-100 transition-colors duration-200"
            >
              Get Quote
            </a>
          </div>

          <button
            className="md:hidden text-white p-1"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25 }}
            className="fixed top-[72px] left-0 right-0 z-40 bg-[#021d47]/98 backdrop-blur-xl border-b border-white/10 md:hidden"
          >
            <div className="flex flex-col px-6 py-6 gap-5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-white/70 hover:text-white font-body text-sm tracking-widest uppercase transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-white/10 pt-4 flex flex-col gap-3">
                <Link href="/calculator" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white text-sm tracking-widest uppercase">
                  🧮 Calculator
                </Link>
                <Link href="/invoice" onClick={() => setMenuOpen(false)} className="text-white/70 hover:text-white text-sm tracking-widest uppercase">
                  🧾 Invoice
                </Link>
              </div>
              <a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                className="bg-white text-[#021d47] text-center py-3 rounded font-body font-semibold text-sm tracking-widest uppercase mt-2"
              >
                Get Quote
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
