import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        clinic: {
          50: "#eef8f6",
          100: "#d4eeea",
          200: "#a9ddd5",
          300: "#76c4ba",
          400: "#45a69b",
          500: "#2a8a80",
          600: "#1d6f68",
          700: "#175a55",
          800: "#134743",
          900: "#0d3330",
          950: "#082220",
        },
        sand: {
          50: "#faf9f6",
          100: "#f2efe8",
          200: "#e6e1d5",
          300: "#d3cbb8",
          400: "#b9ad92",
          500: "#9c8f72",
        },
        ink: {
          50: "#f4f6f6",
          100: "#e7ebeb",
          200: "#d0d7d6",
          300: "#a9b4b2",
          400: "#7b8987",
          500: "#58675f",
          600: "#415049",
          700: "#2b3834",
          800: "#1b2523",
          900: "#0f1716",
        },
        signal: {
          amber: "#b7791f",
          red: "#b3392f",
        },
      },
      fontFamily: {
        display: ['"Fraunces Variable"', "Georgia", "serif"],
        sans: ['"Manrope Variable"', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      letterSpacing: { tightest: "-0.035em" },
      boxShadow: {
        panel: "0 1px 0 rgba(15,23,22,0.04), 0 1px 2px rgba(15,23,22,0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
