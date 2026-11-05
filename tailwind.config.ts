import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Marketing palette: navy #14213d, cream #f4ede0, coral #ff6b5b ──
        navy: {
          DEFAULT: "#14213d",
          dark: "#0c1528",
          light: "#1b2b4d",
          muted: "#22335a",
          hover: "#1e2f55",
        },
        cream: "#f4ede0",
        // The single accent: actions, markers, progress. Navy text on coral
        // (5.7:1); never coral text on cream (2.4:1).
        coral: {
          DEFAULT: "#ff6b5b",
          hover: "#ff8577",
        },
        // Light text on navy bands, tinted toward the cream ground.
        silver: {
          DEFAULT: "#d8cfbf",
          light: "#f4ede0",
          muted: "#a9a293",
          dark: "#6f6a61",
        },
        steel: {
          DEFAULT: "#334155",
          light: "#64748b",
          lighter: "#94a3b8",
          700: "#1c2430",
        },
        // Cream grounds, navy ink. Every ink tone holds 4.5:1 on every ground.
        ground: "#f4ede0",
        surface: "#fbf8f2",
        sunk: "#ebe2d2",
        ink: {
          DEFAULT: "#14213d",
          soft: "#465066",
          faint: "#5a6173",
        },
        rule: {
          DEFAULT: "#dccfba",
          strong: "#c7b69b",
        },
      },
      fontFamily: {
        // Archivo: a grotesque drawn for high-performance printing — the
        // marketing display face. Playfair stays available for admin/invoice.
        display: ["var(--font-archivo)", "system-ui", "sans-serif"],
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "dot-white": "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        "dot-navy": "radial-gradient(circle, rgba(20,33,61,0.06) 1px, transparent 1px)",
      },
      boxShadow: {
        plate: "0 1px 2px rgba(20,33,61,0.05), 0 12px 32px -24px rgba(20,33,61,0.38)",
        "plate-lift": "0 2px 4px rgba(20,33,61,0.06), 0 20px 44px -28px rgba(20,33,61,0.48)",
      },
      borderRadius: {
        // Machined, not soft: 2px is the largest radius on the marketing site.
        plate: "2px",
      },
    },
  },
  plugins: [],
};
export default config;
