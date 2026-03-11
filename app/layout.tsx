import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ruslie Spring — Precision Spring Manufacturing",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/Logo_Ruslie_Spring.png",
  },
  description:
    "Ruslie Spring manufactures world-class springs for automotive, aerospace, electronics, and heavy industry. Engineered to exact specifications since 1999.",
  keywords: "spring manufacturer, compression springs, extension springs, torsion springs, precision engineering",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>{children}</body>
    </html>
  );
}
