import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          green: "#7ab73a",
          "green-hover": "#6ca333",
          "green-light": "#e2f3d4",
          "green-light-alt": "#e6fed8",
          "green-text": "#166534",
          "green-border": "#b2e796",
          cyan: "#0891b2",
          "cyan-tab": "#9cd2df",
          "cyan-subtle": "#e6f0f4",
          "cyan-border": "#bee3ed",
          orange: "#e04d01",
          "orange-alt": "#eb5a00",
          "orange-hover": "#c94300",
          navy: "#0c0f21",
        },
        exam: {
          bg: "#f8f8f8",
          surface: "#ffffff",
          badge: "#f3f4f6",
          border: "#e5e7eb",
          text: "#1e293b",
          muted: "#64748b",
        },
      },
    },
  },
  plugins: [],
};

export default config;
