import type { Config } from "tailwindcss";
// tailwind.config.js
const {heroui} = require("@heroui/react");

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  darkMode: "class",
  plugins: [
    heroui({
      themes: {
        "blip-main": {
          extend: "dark", // <- inherit default values from dark theme
          colors: {
            background: "#0D001A",
            foreground: "#FFFFFF",
            primary: {
              50:  "#FEECEC",  // Very light pinkish red
              100: "#FDCBCB",  // Lighter pastel red
              200: "#FCA5A5",  // Soft warm red
              300: "#F98080",  // Light red
              400: "#F87171",  // Main focus (Tailwind red-400)
              500: "#EF4444",  // Vibrant red
              600: "#DC2626",  // Deeper red
              700: "#B91C1C",  // Darker red
              800: "#991B1B",  // Deep crimson
              900: "#7F1D1D",  // Darkest red
              DEFAULT: "#F87171", // Matches the core theme color
              foreground: "#FFFFFF",
            },
            focus: "#EF4444", // Slightly more vibrant red
          },
          layout: {
            disabledOpacity: "0.3",
            radius: {
              small: "4px",
              medium: "6px",
              large: "8px",
            },
            borderWidth: {
              small: "1px",
              medium: "2px",
              large: "3px",
            },
          },
        },
      },
    }),
  ],
} satisfies Config;
