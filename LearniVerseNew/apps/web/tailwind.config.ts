import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ["var(--font-headline)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        sans: ["var(--font-sans)", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "var(--color-primary)",
          dim: "var(--color-primary-dim)",
          fixed: "var(--color-primary-fixed)",
          container: "var(--color-primary-container)",
        },
        on: {
          primary: {
            DEFAULT: "var(--color-on-primary)",
            container: "var(--color-on-primary-container)",
          },
          secondary: {
            DEFAULT: "var(--color-on-secondary)",
            container: "var(--color-on-secondary-container)",
          },
          tertiary: {
            DEFAULT: "var(--color-on-tertiary)",
            container: "var(--color-on-tertiary-container)",
          },
          surface: {
            DEFAULT: "var(--color-on-surface)",
            variant: "var(--color-on-surface-variant)",
          }
        },
        inverse: {
          primary: "var(--color-inverse-primary)",
          surface: "var(--color-inverse-surface)",
          "on-surface": "var(--color-inverse-on-surface)"
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          dim: "var(--color-secondary-dim)",
          fixed: "var(--color-secondary-fixed)",
          container: "var(--color-secondary-container)",
        },
        tertiary: {
          DEFAULT: "var(--color-tertiary)",
          dim: "var(--color-tertiary-dim)",
          fixed: "var(--color-tertiary-fixed)",
          container: "var(--color-tertiary-container)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          dim: "var(--color-surface-dim)",
          bright: "var(--color-surface-bright)",
          container: {
            lowest: "var(--color-surface-container-lowest)",
            low: "var(--color-surface-container-low)",
            DEFAULT: "var(--color-surface-container)",
            high: "var(--color-surface-container-high)",
            highest: "var(--color-surface-container-highest)"
          },
          variant: "var(--color-surface-variant)"
        },
        outline: {
          DEFAULT: "var(--color-outline)",
          variant: "var(--color-outline-variant)"
        }
      }
    },
  },
  plugins: [],
};
export default config;
