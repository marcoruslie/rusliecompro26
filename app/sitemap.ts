import type { MetadataRoute } from "next";
import { SITE_URL, LOCALES, DEFAULT_LOCALE, localeAlternates } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const home = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
    alternates: { languages: localeAlternates() },
  }));
  const catalog = LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}/katalog`,
    lastModified,
    changeFrequency: "monthly" as const,
    priority: 0.8,
    alternates: { languages: localeAlternates("/katalog") },
  }));
  return [...home, ...catalog];
}
