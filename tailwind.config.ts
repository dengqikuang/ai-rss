import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-newsreader)", "Newsreader", "ui-serif", "Georgia"]
      },
      colors: {
        paper: {
          50: "#f9f7f1",
          100: "#f1eee6",
          900: "#151515"
        },
        ink: {
          500: "#65625d",
          700: "#2f2d2a",
          900: "#171614"
        }
      },
      boxShadow: {
        soft: "0 24px 60px -36px rgba(23, 22, 20, 0.45)"
      }
    }
  },
  plugins: [typography]
};

export default config;
