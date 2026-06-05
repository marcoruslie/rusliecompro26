"use client";

import { useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { MapPin, Phone, Mail, Send } from "lucide-react";
import { SectionIndex } from "./hud";
import { useLanguage } from "@/components/LanguageProvider";

const CONTACT_ICONS = [MapPin, Phone, Mail];
const CONTACT_FIXED = ["+62851 0481 5151", "rusliespring@gmail.com"];

export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const reduce = useReducedMotion();
  const [sent, setSent] = useState(false);
  const { tr } = useLanguage();
  const contactInfo = [
    { Icon: CONTACT_ICONS[0], text: tr.contact.address },
    { Icon: CONTACT_ICONS[1], text: CONTACT_FIXED[0] },
    { Icon: CONTACT_ICONS[2], text: CONTACT_FIXED[1] },
  ];

  return (
    <section
      id="contact"
      ref={ref}
      className="relative py-[120px] px-6 lg:px-10 overflow-hidden bg-graphite border-t border-white/[0.06]"
    >
      <div
        className="absolute inset-0 hud-blueprint pointer-events-none"
        style={{ opacity: 0.5 }}
      />

      {/* Rotating HUD rings */}
      <motion.div
        animate={reduce ? undefined : { rotate: 360 }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[12%] top-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(34,211,238,0.08)" }}
      />
      <motion.div
        animate={reduce ? undefined : { rotate: -360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[6%] top-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(34,211,238,0.12)" }}
      />

      <div className="relative z-10 max-w-[820px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <div className="flex justify-center mb-5">
            <SectionIndex index="06" label={tr.contact.index} />
          </div>
          <h2 className="font-tech font-bold text-[clamp(2rem,4.5vw,3.4rem)] text-hud-silver leading-[1.08] mb-5">
            {tr.contact.titleLine1}
            <br />
            <span className="text-cyan hud-glow-cyan">{tr.contact.titleLine2}</span>
          </h2>
          <p className="font-body text-[1rem] text-hud-silver/50 leading-[1.85] max-w-[500px] mx-auto mb-12">
            {tr.contact.paragraph}
          </p>

          {!sent ? (
            <div className="flex flex-col gap-3.5 max-w-[480px] mx-auto mb-10">
              {[tr.contact.placeholders.name, tr.contact.placeholders.company, tr.contact.placeholders.email].map((ph) => (
                <input
                  key={ph}
                  placeholder={ph}
                  className="w-full bg-carbon border border-white/12 rounded-lg px-5 py-3.5 font-body text-[0.92rem] text-hud-silver placeholder:text-hud-mute focus:border-cyan/60 focus:shadow-cyan-glow outline-none transition-all duration-200"
                />
              ))}
              <textarea
                placeholder={tr.contact.placeholders.message}
                rows={4}
                className="w-full bg-carbon border border-white/12 rounded-lg px-5 py-3.5 font-body text-[0.92rem] text-hud-silver placeholder:text-hud-mute focus:border-cyan/60 focus:shadow-cyan-glow outline-none resize-none transition-all duration-200"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSent(true)}
                className="bg-cyan text-graphite rounded-lg py-4 px-8 font-mono font-medium text-[0.82rem] tracking-[0.16em] uppercase cursor-pointer flex items-center justify-center gap-2 hover:shadow-cyan-glow transition-shadow duration-300"
              >
                <Send size={16} />
                {tr.contact.requestQuote}
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-[480px] mx-auto mb-10 p-10 bg-carbon border border-cyan/25 rounded-2xl"
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-cyan/10 border border-cyan/30 flex items-center justify-center mb-4">
                <Send size={20} className="text-cyan" />
              </div>
              <div className="font-tech text-hud-silver text-xl font-semibold mb-2">
                {tr.contact.sentTitle}
              </div>
              <div className="font-body text-hud-silver/50 text-sm">
                {tr.contact.sentBody}
              </div>
            </motion.div>
          )}

          {/* Contact info */}
          <div className="flex justify-center gap-8 flex-wrap">
            {contactInfo.map(({ Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon size={16} className="text-cyan" />
                <span className="font-mono text-[0.78rem] text-hud-silver/55">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
