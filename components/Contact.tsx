"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { MapPin, Phone, Mail, Send } from "lucide-react";

const CONTACT_INFO = [
  { icon: MapPin, text: "Jl. Sikatan 45, Manukan Wetan, Tandes" },
  { icon: Phone, text: "+62851 0481 5151" },
  { icon: Mail, text: "rusliespring@gmail.com" },
];

export default function Contact() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [sent, setSent] = useState(false);

  return (
    <section
      id="contact"
      ref={ref}
      className="relative py-[120px] px-6 lg:px-10 overflow-hidden"
      style={{ background: "#021d47" }}
    >
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "36px 36px",
        }}
      />

      {/* Rotating circle decoration */}
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[12%] top-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(255,255,255,0.04)" }}
      />
      <motion.div
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute -right-[6%] top-1/2 -translate-y-1/2 w-[360px] h-[360px] rounded-full pointer-events-none"
        style={{ border: "1px solid rgba(255,255,255,0.06)" }}
      />

      <div className="relative z-10 max-w-[820px] mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <p className="font-body text-[0.72rem] text-silver-muted tracking-[0.25em] uppercase mb-4">
            Get In Touch
          </p>
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] font-bold text-white leading-[1.1] mb-5">
            Ready to Engineer
            <br />
            <span className="text-silver-light">Your Next Spring?</span>
          </h2>
          <p className="font-body text-[1rem] text-white/48 leading-[1.85] max-w-[500px] mx-auto mb-12">
            Send us your drawings, specs, or ideas. Our engineers respond within
            24 hours with a detailed quote and technical consultation.
          </p>

          {/* Form */}
          {!sent ? (
            <div className="flex flex-col gap-3.5 max-w-[480px] mx-auto mb-10">
              {["Your Name", "Company / Industry", "Email Address"].map(
                (ph) => (
                  <input
                    key={ph}
                    placeholder={ph}
                    className="w-full bg-white/7 border border-white/14 rounded-lg px-5 py-3.5 font-body text-[0.92rem] text-black placeholder-white/32 focus:border-white/35 outline-none transition-colors placeholder:text-gray-600"
                  />
                )
              )}
              <textarea
                placeholder="Describe your spring requirements..."
                rows={4}
                className="w-full bg-white/7 border border-white/14 rounded-lg px-5 py-3.5 font-body text-[0.92rem] text-black placeholder-white/32 focus:border-white/35 outline-none resize-none transition-colors placeholder:text-gray-600"
              />
              <motion.button
                whileHover={{
                  scale: 1.03,
                  boxShadow: "0 0 36px rgba(192,200,216,0.3)",
                }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setSent(true)}
                className="bg-white text-[#021d47] border-none rounded-lg py-4 px-8 font-body font-bold text-[0.9rem] tracking-[0.12em] uppercase cursor-pointer flex items-center justify-center gap-2"
              >
                <Send size={16} />
                Request a Quote
              </motion.button>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-[480px] mx-auto mb-10 p-10 bg-white/7 border border-white/14 rounded-2xl"
            >
              <div className="text-4xl mb-4">✅</div>
              <div className="font-display text-white text-xl font-semibold mb-2">
                Message Sent!
              </div>
              <div className="font-body text-white/50 text-sm">
                Our team will get back to you within 24 hours.
              </div>
            </motion.div>
          )}

          {/* Contact info */}
          <div className="flex justify-center gap-8 flex-wrap">
            {CONTACT_INFO.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2.5">
                <Icon size={16} className="text-silver-muted" />
                <span className="font-body text-[0.84rem] text-white/45">
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
