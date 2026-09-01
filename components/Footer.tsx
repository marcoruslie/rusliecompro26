"use client";

import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";

export default function Footer() {
  const { t } = useLanguage();
  const { stageEnabled } = useScrollStage();
  return (
    <footer
      id="footer"
      className={`relative border-t border-rule bg-ground ${
        stageEnabled ? "flex h-screen items-center justify-center" : ""
      }`}
    >
      <div className="relative mx-auto flex w-full max-w-7xl flex-col flex-wrap items-center justify-between gap-3 px-6 py-8 sm:flex-row lg:px-10">
        <span className="font-body text-[0.85rem] text-ink-soft">
          © 2026 <span className="font-semibold text-ink">Ruslie Spring</span>.{" "}
          {t.footer.rights}
        </span>
        <span className="font-mono text-[0.64rem] uppercase tracking-[0.22em] text-ink-faint">
          {t.footer.tagline}
        </span>
      </div>
    </footer>
  );
}
