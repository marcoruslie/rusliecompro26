// Central SEO config for the multilingual marketing site (/en, /id, /zh).
// Absolute URLs are required for canonical, hreflang, Open Graph, and sitemap.

import type { Lang } from "./translations";

export const SITE_URL = "https://rusliespring.com";
export const LOCALES = ["en", "id", "zh"] as const;
export const DEFAULT_LOCALE: Lang = "en";

export function isLocale(value: string): value is Lang {
  return (LOCALES as readonly string[]).includes(value);
}

type SeoEntry = {
  title: string;
  description: string;
  keywords: string;
  ogLocale: string; // BCP-47-ish locale for og:locale
};

export const SEO: Record<Lang, SeoEntry> = {
  en: {
    title: "Ruslie Spring — Precision Spring Manufacturer in Indonesia",
    description:
      "Ruslie Spring manufactures precision compression, extension, and torsion springs in Indonesia for automotive, electronics, defense, and heavy industry — engineered to international tolerances.",
    keywords:
      "spring manufacturer Indonesia, compression springs, extension springs, torsion springs, custom springs, precision springs, wire forms, Surabaya spring factory",
    ogLocale: "en_US",
  },
  id: {
    title: "Ruslie Spring — Produsen Pegas Presisi di Indonesia",
    description:
      "Ruslie Spring memproduksi pegas presisi — per tekan, per tarik, dan per puntir — di Indonesia untuk industri otomotif, elektronik, pertahanan, dan berat, sesuai toleransi internasional.",
    keywords:
      "produsen pegas, pabrik pegas Indonesia, pegas presisi, per tekan, per tarik, per puntir, pegas custom, kawat per, pabrik pegas Surabaya",
    ogLocale: "id_ID",
  },
  zh: {
    title: "Ruslie Spring — 印度尼西亚精密弹簧制造商",
    description:
      "Ruslie Spring 在印度尼西亚生产精密压缩弹簧、拉伸弹簧和扭转弹簧，服务于汽车、电子、国防和重工业，均按国际公差精密制造。",
    keywords:
      "弹簧制造商, 印尼弹簧厂, 精密弹簧, 压缩弹簧, 拉伸弹簧, 扭转弹簧, 定制弹簧, 泗水弹簧厂",
    ogLocale: "zh_CN",
  },
};

export const ORG_NAME = "Ruslie Spring";
export const ORG_PHONE = "+6285104815151";
export const ORG_EMAIL = "rusliespring@gmail.com";
export const OG_IMAGE = "/banner/banner2.jpg";

/** hreflang map (every locale + x-default) for metadata + sitemap alternates. */
export function localeAlternates(): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = `${SITE_URL}/${l}`;
  languages["x-default"] = `${SITE_URL}/${DEFAULT_LOCALE}`;
  return languages;
}

/** Organization / LocalBusiness JSON-LD, localized per page. */
export function organizationJsonLd(locale: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: ORG_NAME,
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/Logo_Ruslie_Spring.png`,
    image: `${SITE_URL}${OG_IMAGE}`,
    description: SEO[locale].description,
    email: ORG_EMAIL,
    telephone: ORG_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Sikatan 45, Manukan Wetan, Tandes",
      addressLocality: "Surabaya",
      addressRegion: "Jawa Timur",
      addressCountry: "ID",
    },
    areaServed: "ID",
  };
}
