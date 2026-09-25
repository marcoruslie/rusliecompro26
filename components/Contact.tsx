"use client";

import { useRef, useState } from "react";
import { motion, useInView, useMotionValueEvent } from "framer-motion";
import { MapPin, Phone, Mail, ArrowRight, Check, MessageCircle } from "lucide-react";
import { SectionLabel, Action } from "./industrial";
import { ORG_PHONE } from "@/lib/seo";
import { useLanguage } from "@/lib/i18n";
import { useSectionScrub, useScrollStage } from "@/lib/scrollStage";

export const WHATSAPP_URL = `https://wa.me/${ORG_PHONE.replace(/\D/g, "")}`;

// Shared with the footer.
export const CONTACT_INFO = [
  { icon: MapPin, text: "Jl. Sikatan 45, Manukan Wetan, Tandes, Surabaya" },
  { icon: Phone, text: "+62851 0481 5151" },
  { icon: Mail, text: "rusliespring@gmail.com" },
];

export default function Contact() {
  const { t } = useLanguage();
  const ref = useRef<HTMLElement>(null);
  const { stageEnabled } = useScrollStage();
  const progress = useSectionScrub("contact", ref);
  const nativeInView = useInView(ref, { once: true, margin: "-80px" });
  const [sent, setSent] = useState(false);
  const [scrubReveal, setScrubReveal] = useState(false);
  useMotionValueEvent(progress, "change", (v) => {
    if (v > 0.1) setScrubReveal(true);
  });
  const inView = stageEnabled ? scrubReveal : nativeInView;

  const fieldClass =
    "w-full rounded-plate border border-rule-strong bg-surface px-4 py-3.5 font-body text-[0.92rem] text-ink outline-none transition-colors duration-200 placeholder:text-ink-faint focus:border-navy";

  return (
    <section
      id="contact"
      ref={ref}
      className={`relative overflow-hidden border-t border-rule bg-ground px-6 lg:px-10 ${
        stageEnabled ? "flex h-screen items-center py-20" : "py-[120px]"
      }`}
    >
      <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
        {/* Left — the ask */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6 }}
        >
          <SectionLabel label={t.contact.label} className="mb-5" />
          <h2 className="font-condensed mb-6 font-display text-[clamp(2.3rem,4.6vw,3.9rem)] font-extrabold leading-[0.98] tracking-[-0.02em] text-ink">
            {t.contact.heading[0]} {t.contact.heading[1]}
          </h2>
          <p className="mb-8 max-w-[48ch] font-body text-[1.02rem] leading-[1.8] text-ink-soft">
            {t.contact.paragraph}
          </p>

          <Action href={WHATSAPP_URL} variant="ghost" className="mb-10">
            <MessageCircle size={16} /> {t.catalog.ctaWhatsapp}
          </Action>

          <div className="divide-y divide-rule border-t border-rule">
            {CONTACT_INFO.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 py-4">
                <Icon size={17} strokeWidth={1.7} className="flex-shrink-0 text-navy" />
                <span className="font-body text-[0.95rem] text-ink">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — the enquiry */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : undefined}
          transition={{ duration: 0.6, delay: 0.12 }}
          className="self-start rounded-plate border border-rule bg-surface p-7 shadow-plate lg:p-10"
        >
          {!sent ? (
            <div className="flex flex-col gap-3">
              {[
                t.contact.placeholders.name,
                t.contact.placeholders.company,
                t.contact.placeholders.email,
              ].map((ph) => (
                <input key={ph} placeholder={ph} aria-label={ph} className={fieldClass} />
              ))}
              <textarea
                placeholder={t.contact.placeholders.message}
                aria-label={t.contact.placeholders.message}
                rows={4}
                className={`${fieldClass} resize-none`}
              />
              <button
                onClick={() => setSent(true)}
                className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-plate bg-navy px-8 py-4 font-display text-[0.95rem] font-semibold text-white transition-colors duration-200 hover:bg-navy-hover"
              >
                {t.contact.button}
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="py-10 text-center"
            >
              <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-plate border border-navy/25 bg-navy/[0.06]">
                <Check size={20} className="text-navy" />
              </div>
              <div className="mb-2 font-display text-lg font-semibold text-ink">
                {t.contact.sentTitle}
              </div>
              <div className="font-body text-sm text-ink-soft">
                {t.contact.sentText}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
