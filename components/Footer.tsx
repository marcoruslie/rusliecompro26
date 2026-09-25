"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n";
import { useScrollStage } from "@/lib/scrollStage";
import { CONTACT_INFO } from "./Contact";

// Same order as t.nav.links (and NAV_HREFS in Navbar.tsx).
const NAV_HASHES = ["#about", "#process", "#products", "#capabilities", "#gallery", "#contact"];

export default function Footer() {
  const { t, lang } = useLanguage();
  const { stageEnabled } = useScrollStage();
  return (
    <footer
      id="footer"
      className={`relative bg-navy-dark px-6 text-white lg:px-10 ${
        stageEnabled ? "flex h-screen items-center justify-center" : ""
      }`}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-1 gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.8fr_1.1fr]">
          <div>
            <div className="font-condensed mb-4 font-display text-[2rem] font-extrabold leading-none tracking-[-0.01em]">
              Ruslie Spring
            </div>
            <p className="max-w-[40ch] font-body text-[0.92rem] leading-[1.7] text-silver">
              {t.hero.paragraph}
            </p>
          </div>

          <nav aria-label={t.footer.explore}>
            <h2 className="mb-4 font-display text-[0.95rem] font-bold">{t.footer.explore}</h2>
            <ul className="space-y-2.5">
              {NAV_HASHES.map((hash, i) => (
                <li key={hash}>
                  <Link
                    href={`/${lang}${hash}`}
                    className="font-body text-[0.92rem] text-silver transition-colors hover:text-white"
                  >
                    {t.nav.links[i]}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${lang}/katalog`}
                  className="font-body text-[0.92rem] text-silver transition-colors hover:text-white"
                >
                  {t.nav.catalog}
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 className="mb-4 font-display text-[0.95rem] font-bold">{t.footer.contactTitle}</h2>
            <ul className="space-y-3.5">
              {CONTACT_INFO.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 font-body text-[0.92rem] text-silver">
                  <Icon size={16} strokeWidth={1.7} className="mt-0.5 flex-shrink-0 text-silver-muted" />
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-white/10 py-6 font-body text-[0.82rem] text-silver-muted sm:flex-row">
          <span>
            © 2026 Ruslie Spring. {t.footer.rights}
          </span>
          <span>{t.footer.tagline}</span>
        </div>
      </div>
    </footer>
  );
}
