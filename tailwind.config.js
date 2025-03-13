/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main brand colors
        primary: {
          DEFAULT: "var(--color-primary)",
          light: "var(--color-primary-light)",
          dark: "var(--color-primary-dark)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          light: "var(--color-secondary-light)",
          dark: "var(--color-secondary-dark)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          light: "var(--color-accent-light)",
          dark: "var(--color-accent-dark)",
        },

        // Background colors
        background: {
          DEFAULT: "var(--color-background)",
          alt: "var(--color-background-alt)",
          card: "var(--color-background-card)",
        },

        // Text colors
        text: {
          DEFAULT: "var(--color-text)",
          light: "var(--color-text-light)",
          muted: "var(--color-text-muted)",
          dark: "var(--color-text-dark)",
        },

        // UI element colors
        "ui-border": "var(--color-ui-border)",
        input: "var(--color-input)",
        ring: "var(--color-ring)",
        error: "var(--color-error)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
        montserrat: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};
