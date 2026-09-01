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
        navy: {
          DEFAULT: "#021d47",
          dark: "#010e24",
          light: "#031d4a",
          muted: "#0a1f4e",
          hover: "#0a2a5e",
        },
        silver: {
          DEFAULT: "#c0c8d8",
          light: "#e8edf5",
          muted: "#8899b4",
          dark: "#5a6a82",
        },
        steel: {
          DEFAULT: "#334155",
          light: "#64748b",
          lighter: "#94a3b8",
          700: "#1c2430",
        },
        // ── Light-industrial palette (marketing site) ──
        // Warm mineral grounds, near-black ink, brand navy as the only accent.
        ground: "#f4f3f1",
        surface: "#ffffff",
        sunk: "#e8e6e1",
        ink: {
          DEFAULT: "#16181c",
          soft: "#4a4f57",
          faint: "#8a9099",
        },
        rule: {
          DEFAULT: "#dcd9d3",
          strong: "#c6c2ba",
        },
        // Colour of steel at stress-relief temperature. Used only where the
        // page actually depicts heat — never as decoration.
        anneal: "#b4491f",
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
        "dot-navy": "radial-gradient(circle, rgba(2,29,71,0.06) 1px, transparent 1px)",
      },
      boxShadow: {
        plate: "0 1px 2px rgba(22,24,28,0.04), 0 12px 32px -24px rgba(22,24,28,0.35)",
        "plate-lift": "0 2px 4px rgba(22,24,28,0.05), 0 20px 44px -28px rgba(22,24,28,0.45)",
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
