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
        },
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "dot-white": "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
        "dot-navy": "radial-gradient(circle, rgba(2,29,71,0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
