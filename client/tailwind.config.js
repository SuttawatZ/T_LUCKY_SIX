/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: { ink: "#10233d", gold: "#f5b544", cream: "#fffaf2" },
      fontFamily: { sans: ["Noto Sans Thai", "DM Sans", "sans-serif"] },
      boxShadow: { ticket: "0 14px 30px rgba(16, 35, 61, .08)" },
    },
  },
  plugins: [],
};
