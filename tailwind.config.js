/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink:     "#F5F3EE",
        surface: "#FFFFFF",
        bone:    "#1A1A1A",
        gold:    "#B8903E",
        muted:   "#6B6B7A",
      },
      fontFamily: { sans: ["System"] },
    },
  },
  plugins: [],
};
