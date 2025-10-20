/** @type {import('tailwindcss').Config} */
const colors = require("tailwindcss/colors");
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    colors: {
      azulOscuro: "#1C1C3A",
      verdeClaro: "#8FE489",
      lilaClaro: "#cb8dd952",
      lilaMuyClaro: "#F6F0FF",
      lilaOscuro: "#704f80",
      lilaText: "#46324b",
      amarilloClaro: "#f5d7a9",
      naranjaClaro: "rgb(251 225 217)",
      transparent: "transparent",
      current: "currentColor",
      eventDraft: "#fff8c2", // Amarillo suave para borrador
      eventScheduler: "#d8f5d0", // Verde suave para borrador
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
