/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        oracle: {
          bg: "#060a10",
          surface1: "#0b1120",
          surface2: "#111b2e",
          border: "#1a2744",
          "border-hover": "#2563eb",
          text: "#e8ecf4",
          "text-muted": "#7b8db5",
          "text-dim": "#4a5d84",
          accent: "#3b82f6",
          green: "#22c55e",
          red: "#ef4444",
          yellow: "#eab308",
          purple: "#a855f7",
          cyan: "#06b6d4",
        },
      },
      fontFamily: {
        sans: ["'Space Grotesk'", "-apple-system", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
