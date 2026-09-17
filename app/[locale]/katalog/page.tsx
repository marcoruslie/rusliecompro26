import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import KatalogClient from "@/components/KatalogClient";
import Footer from "@/components/Footer";
import { LanguageProvider } from "@/lib/i18n";
import { ScrollStageProvider, type SectionDef } from "@/lib/scrollStage";
import type { Lang } from "@/lib/translations";
import {
  CATALOG_SEO,
  SITE_URL,
  LOCALES,
  ORG_NAME,
  isLocale,
  localeAlternates,
} from "@/lib/seo";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

const OG_IMAGE = "/katalog/cover-1.jpg";

export function generateMetadata({
  params,
}: {
  params: { locale: string };
}): Metadata {
  const locale: Lang = isLocale(params.locale) ? params.locale : "en";
  const seo = CATALOG_SEO[locale];
  const url = `${SITE_URL}/${locale}/katalog`;
  return {
    metadataBase: new URL(SITE_URL),
    title: seo.title,
    description: seo.description,
    alternates: {
      canonical: url,
      languages: localeAlternates("/katalog"),
    },
    openGraph: {
      type: "website",
      siteName: ORG_NAME,
      title: seo.title,
      description: seo.description,
      url,
      images: [{ url: OG_IMAGE, alt: seo.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [OG_IMAGE],
    },
  };
}

// Navbar/Footer read the scroll-stage context; the stage itself stays disabled.
const SECTIONS: SectionDef[] = [
  { id: "katalog", mode: "reveal", node: null },
  { id: "footer", mode: "reveal", node: null },
];

export default function KatalogPage({ params }: { params: { locale: string } }) {
  if (!isLocale(params.locale)) notFound();
  const locale: Lang = params.locale;

  return (
    <LanguageProvider initialLang={locale}>
      <ScrollStageProvider sections={SECTIONS}>
        <main className="ind-root min-h-screen">
          <Navbar />
          <KatalogClient />
          <Footer />
        </main>
      </ScrollStageProvider>
    </LanguageProvider>
  );
}
