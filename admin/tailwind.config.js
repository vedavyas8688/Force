/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        app: {
          bg: "var(--color-bg)",
          surface: "var(--color-surface)",
          surfaceSoft: "var(--color-surface-soft)",
          border: "var(--color-border)",
          ink: "var(--color-ink)",
          muted: "var(--color-muted)",
          accent: "var(--color-accent)",
          accentSoft: "var(--color-accent-soft)",
          success: "var(--color-success)",
          warning: "var(--color-warning)",
          danger: "var(--color-danger)",
        },
      },
      boxShadow: {
        card: "0 10px 28px rgba(15, 23, 42, 0.06)",
        lift: "0 16px 44px rgba(15, 23, 42, 0.10)",
      },
      borderRadius: {
        app: "var(--radius-app)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
