/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // EduSpace brand palette — matches web design tokens
        primary: {
          DEFAULT: "#0284c7",   // sky-600
          dark: "#0369a1",      // sky-700
          light: "#38bdf8",     // sky-400
        },
        secondary: {
          DEFAULT: "#7c3aed",   // violet-600
          dark: "#6d28d9",      // violet-700
          light: "#a78bfa",     // violet-400
        },
        surface: {
          DEFAULT: "#ffffff",
          muted: "#f8fafc",      // slate-50
          container: "#f1f5f9",  // slate-100
        },
        "on-surface": {
          DEFAULT: "#0f172a",   // slate-950
          muted: "#64748b",     // slate-500
          subtle: "#94a3b8",    // slate-400
        },
        brand: {
          navy: "#0f172a",      // slate-950
          sky: "#0284c7",
          violet: "#7c3aed",
          emerald: "#059669",
          rose: "#e11d48",
          amber: "#d97706",
        },
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "system-ui"],
        body: ["Manrope", "system-ui"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
    },
  },
  plugins: [],
};
