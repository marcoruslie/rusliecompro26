import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SITE_URL, SEO } from "@/lib/seo";

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
    <html lang="en" className="scroll-smooth">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
