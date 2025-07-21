/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    colors: {
      lilaClaro: "#cb8dd952",
      lilaMuyClaro: "#ecd6f152",
      lilaOscuro: "#704f80",
      lilaText: "#46324b",
      amarilloClaro: "#f5d7a9",
      naranjaClaro: "rgb(251 225 217)",
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      gray: colors.gray,
      emerald: colors.emerald,
      indigo: colors.indigo,
      yellow: colors.yellow,
    },
    extend: {},
  },
  plugins: [],
};
