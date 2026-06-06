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
    title: "Ruslie Spring — Custom Spring Manufacturer in Surabaya, Indonesia",
    description:
      "Ruslie Spring is a custom spring manufacturer in Surabaya, Indonesia — compression, extension, and torsion springs plus wire forms, made to your exact specifications for automotive, electronics, defense, and heavy industry.",
    keywords:
      "custom spring Surabaya, custom spring Indonesia, kustom spring Surabaya, custom springs, bespoke springs, spring manufacturer Indonesia, Surabaya spring factory, compression springs, extension springs, torsion springs, precision springs, wire forms",
    ogLocale: "en_US",
  },
  id: {
    title: "Ruslie Spring — Produsen Kustom Spring (Pegas) di Surabaya, Indonesia",
    description:
      "Ruslie Spring adalah produsen kustom spring / pegas presisi di Surabaya, Indonesia — per tekan, per tarik, per puntir, dan kawat per dibuat sesuai pesanan untuk industri otomotif, elektronik, pertahanan, dan berat.",
    keywords:
      "kustom spring Surabaya, custom spring Surabaya, kustom spring Indonesia, pegas kustom, per custom, produsen pegas Surabaya, pabrik pegas Surabaya, pabrik pegas Indonesia, pegas presisi, per tekan, per tarik, per puntir, kawat per",
    ogLocale: "id_ID",
  },
  zh: {
    title: "Ruslie Spring — 印度尼西亚泗水定制弹簧制造商",
    description:
      "Ruslie Spring 是位于印度尼西亚泗水的定制弹簧制造商，按需定制压缩弹簧、拉伸弹簧、扭转弹簧及线成型件，服务于汽车、电子、国防和重工业。",
    keywords:
      "定制弹簧, 印尼定制弹簧, 泗水定制弹簧, 定制弹簧制造商, 印尼弹簧厂, 泗水弹簧厂, 精密弹簧, 压缩弹簧, 拉伸弹簧, 扭转弹簧, custom spring Surabaya, kustom spring Indonesia",
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

// Products/specialities we want associated with the business (local + product SEO).
const KNOWS_ABOUT = [
  "Custom springs",
  "Compression springs",
  "Extension springs",
  "Torsion springs",
  "Wire forms",
  "Precision spring manufacturing",
];

/** Organization / LocalBusiness JSON-LD, localized per page. */
export function organizationJsonLd(locale: Lang) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    name: ORG_NAME,
    url: `${SITE_URL}/${locale}`,
    logo: `${SITE_URL}/Logo_Ruslie_Spring.png`,
    image: `${SITE_URL}${OG_IMAGE}`,
    description: SEO[locale].description,
    keywords: SEO[locale].keywords,
    slogan: "Custom springs, made in Surabaya, Indonesia",
    email: ORG_EMAIL,
    telephone: ORG_PHONE,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Sikatan 45, Manukan Wetan, Tandes",
      addressLocality: "Surabaya",
      addressRegion: "Jawa Timur",
      addressCountry: "ID",
    },
    areaServed: [
      { "@type": "City", name: "Surabaya" },
      { "@type": "Country", name: "Indonesia" },
    ],
    knowsAbout: KNOWS_ABOUT,
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Product",
        name: "Custom springs",
        category: "Spring manufacturing",
      },
    },
  };
}
