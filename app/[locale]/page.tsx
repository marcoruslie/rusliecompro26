import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Process from "@/components/Process";
import Products from "@/components/Products";
import Gallery from "@/components/Gallery";
import Capabilities from "@/components/Capabilities";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/lib/i18n";
import { ScrollStageProvider, type SectionDef } from "@/lib/scrollStage";
import type { Lang } from "@/lib/translations";
import {
  SEO,
  SITE_URL,
  LOCALES,
  OG_IMAGE,
  ORG_NAME,
  isLocale,
  localeAlternates,
  organizationJsonLd,
} from "@/lib/seo";

// Only the three known locales exist; any other path 404s.
export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale: Lang = isLocale(params.locale) ? params.locale : "en";
  const seo = SEO[locale];
  const url = `${SITE_URL}/${locale}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    alternates: {
      canonical: url,
      languages: localeAlternates(),
    },
    openGraph: {
      type: "website",
      siteName: ORG_NAME,
      title: seo.title,
      description: seo.description,
      url,
      locale: seo.ogLocale,
      images: [{ url: OG_IMAGE, alt: ORG_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE],
    },
  };
}

// Section id/mode registry for the (dormant) scroll-stage hooks.
const SECTIONS: SectionDef[] = [
  { id: "hero", mode: "reveal", node: null },
  { id: "about", mode: "reveal", node: null },
  { id: "process", mode: "pan", node: null },
  { id: "products", mode: "pan", node: null },
  { id: "capabilities", mode: "reveal", node: null },
  { id: "gallery", mode: "pan", node: null },
  { id: "contact", mode: "reveal", node: null },
  { id: "footer", mode: "reveal", node: null },
];

export default function LocaleHome({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Lang = params.locale;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd(locale)),
        }}
      />
      <LanguageProvider initialLang={locale}>
        <ScrollStageProvider sections={SECTIONS}>
          <main className="hud-root">
            <Navbar />
            <Hero />
            <About />
            <Process />
            <Products />
            <Capabilities />
            <Gallery />
            <Contact />
            <Footer />
          </main>
        </ScrollStageProvider>
      </LanguageProvider>
    </>
  );
}
