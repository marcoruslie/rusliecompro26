"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Globe, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage, LANGUAGES } from "@/lib/i18n";

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Change language"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 font-mono text-[0.72rem] tracking-[0.14em] uppercase text-ink-soft hover:text-navy transition-colors duration-200"
      >
        <Globe size={15} />
        {current.label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute right-0 mt-3 min-w-[120px] rounded-plate border border-rule bg-surface py-1.5 shadow-plate z-50"
          >
            {LANGUAGES.map((l) => {
              const active = l.code === lang;
              return (
                <li key={l.code} role="option" aria-selected={active}>
                  <button
                    onClick={() => {
                      router.push(`/${l.code}`);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-2 font-mono text-[0.72rem] tracking-[0.12em] uppercase transition-colors duration-150 ${
                      active
                        ? "text-navy"
                        : "text-ink-soft hover:text-navy hover:bg-sunk"
                    }`}
                  >
                    {l.label}
                    {active && <Check size={13} />}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
