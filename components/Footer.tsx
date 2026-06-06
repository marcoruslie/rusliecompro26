"use client";

import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";

export default function Footer() {
  const { t } = useLanguage();
  const { stageEnabled } = useScrollStage();
  return (
    <footer
      id="footer"
      className={`relative bg-graphite border-t border-white/[0.06] overflow-hidden ${
        stageEnabled ? "h-screen flex items-center justify-center" : ""
      }`}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-16 hud-blueprint pointer-events-none"
        style={{ opacity: 0.4 }}
      />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 py-8 flex flex-col sm:flex-row justify-between items-center gap-3 flex-wrap w-full">
        <span className="font-tech text-hud-silver/45 text-[0.88rem]">
          © 2026{" "}
          <span className="text-cyan">Ruslie Spring</span>. {t.footer.rights}
        </span>
        <span className="font-mono text-hud-mute text-[0.66rem] tracking-[0.22em] uppercase">
          {t.footer.tagline}
        </span>
      </div>
    </footer>
  );
}
