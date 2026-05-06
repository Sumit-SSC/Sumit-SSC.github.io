/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./pages/**/*.html",
    "./standalone-playground/**/*.html",
    "./dev/**/*.html",
    "./admin/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5",
        accent: "#0ea5e9"
      }
    }
  },
  plugins: []
};
