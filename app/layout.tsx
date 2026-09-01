import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Archivo, Playfair_Display, DM_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SITE_URL, SEO } from "@/lib/seo";

// Self-hosted via next/font: no render-blocking @import, no third-party round
// trips, and automatic size-adjust fallbacks to minimize CLS. Each exposes the
// same CSS variable the styles/components already consume (var(--font-*)).
// Weights/styles are trimmed to what the codebase actually uses (audited via
// grep for font-* classes and inline fontWeight) — every extra variant here is
// another preloaded woff2 on every page.
// Marketing display face — a grotesque drawn for high-performance printing.
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
// Playfair is admin/invoice only (.admin-title, invoice documents).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
  fallback: ["Georgia", "serif"],
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-dm-sans",
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO.en.title,
    template: "%s",
  },
  description: SEO.en.description,
  keywords: SEO.en.keywords,
  icons: {
    icon: "/favicon.ico",
    shortcut: "/Logo_Ruslie_Spring.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`scroll-smooth ${archivo.variable} ${playfair.variable} ${dmSans.variable} ${ibmPlexMono.variable}`}
    >
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
