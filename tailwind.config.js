// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the standard NativeWind v4 content paths
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#0891B2",
          dark: "#0E7490",
          light: "#ECFEFF",
        },
        accent: {
          complete: "#10B981",
          warm: "#F59E0B",
        },
        deep: "#0F172A",
        surface: "#F8FAFC",
        "text-primary": "#1E293B",
        "text-muted": "#64748B",
        border: "#E2E8F0",
      },
      borderRadius: {
        xl: "12px",
      },
    },
  },
  plugins: [],
};