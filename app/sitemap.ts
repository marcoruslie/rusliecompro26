import type { MetadataRoute } from "next";
import { SITE_URL, LOCALES, DEFAULT_LOCALE, localeAlternates } from "@/lib/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return LOCALES.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "monthly",
    priority: locale === DEFAULT_LOCALE ? 1 : 0.9,
    alternates: { languages: localeAlternates() },
  }));
}
