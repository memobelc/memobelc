import { colors } from "./src/styles/colors"
module.exports = {
    content: ["./src/**/*.{ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
      extend: {
        colors,
        fontFamily: "ComicSans"
      },
    },
    plugins: [],
  }