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
        // Engineering-HUD palette (marketing redesign)
        graphite: "#0a0e14",
        carbon: "#11161f",
        cyan: {
          DEFAULT: "#22d3ee",
          dim: "#0e7490",
          deep: "#155e75",
        },
        hud: {
          silver: "#c8d2e0",
          mute: "#6b7689",
          line: "rgba(255,255,255,0.08)",
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
        tech: ["var(--font-chakra)", "var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      backgroundImage: {
        "dot-white": "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        "dot-navy": "radial-gradient(circle, rgba(2,29,71,0.06) 1px, transparent 1px)",
        "dot-cyan": "radial-gradient(circle, rgba(34,211,238,0.10) 1px, transparent 1px)",
      },
      boxShadow: {
        "cyan-glow": "0 0 0 1px rgba(34,211,238,0.35), 0 0 28px -4px rgba(34,211,238,0.45)",
      },
    },
  },
  plugins: [],
};
export default config;
