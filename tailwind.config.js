/** @type {import('tailwindcss').Config} */
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  important: "#biomes-app",
  theme: {
    colors: {
      white: "#ffffff",
      black: "#000000",
      "off-white": "rgb(255 255 255 / 85%)",
      "translucent-white": "rgb(255 255 255 / 20%)",
      "secondary-gray": "rgb(255 255 255 / 80%)",
      "tertiary-gray": "rgb(255 255 255 / 55%)",
      "dark-grey": "#1f1f1f",
      "light-green": "#b5e28d",
      green: "#67ab2b",
      "dark-green": "#395f18",
      "light-blue": "#a0e0f1",
      blue: "#2db3ff",
      "side-quest-blue": "#b4b5d0",
      magenta: "#e35ff5",
      "light-magenta": "#ebaaf3",
      "lighter-yellow": "#ebf6d9",
      "light-yellow": "#f0f1b9",
      yellow: "#e7ea3b",
      "dark-yellow": "#444511cc",
      orange: "#f4d027",
      red: "#f0545b",
      "light-red": "#f3b3b1",
      mint: "#99fadc",
      "light-purple": "#9277f0",
      purple: "#7354f0",
      silver: "#c1c2dd",
      "tooltip-bg": "rgb(var(--tooltip-bg-100) / <alpha-value>)",
      "dialog-bg": "var(--dialog-bg)",
      "dialog-bg-dark": "var(--dialog-bg-dark)",
      "cell-bg": "var(--cell-bg)",
      "off-black": "rgb(0 0 0 / 15%)",
      "loading-bg": "#473975",
      discord: "#5865F2",
      twitch: "#6441A5",
    },

    fontSize: {
      xs: "calc(var(--font-size-medium) * 0.7)",
      sm: "calc(var(--font-size-medium) * 0.88)",
      med: "var(--font-size-medium)",
      marge: "calc(var(--font-size-medium) * 1.15)",
      l: "calc(var(--font-size-medium) * 1.33)",
      xl: "calc(var(--font-size-medium) * 1.5)",
      xxl: "calc(var(--font-size-medium) * 2)",
      xxxl: "calc(var(--font-size-medium) * 2.5)",
      inherit: "inherit",
    },

    spacing: {
      0: "0",
      0.2: "0.2vmin",
      0.4: "0.4vmin",
      0.6: "0.6vmin",
      0.8: "0.8vmin",
      1: "1vmin",
      2: "2vmin",
      3: "3vmin",
      4: "4vmin",
      5: "5vmin",
      6: "6vmin",
      7: "7vmin",
      8: "8vmin",
      10: "10vmin",
      12: "12vmin",
      16: "16vmin",
      20: "20vmin",
      24: "24vmin",
      32: "32vmin",
      40: "40vmin",
      48: "48vmin",
      56: "56vmin",
      64: "64vmin",
      98: "98vmin",
      px: "1px",
    },

    spacing: {
      0: "0",
      0.1: "0.1vmin",
      0.2: "0.2vmin",
      0.4: "0.4vmin",
      0.6: "0.6vmin",
      0.8: "0.8vmin",
      1: "1vmin",
      2: "2vmin",
      2.5: "2.5vmin",
      3: "3vmin",
      4: "4vmin",
      5: "5vmin",
      6: "6vmin",
      7: "7vmin",
      8: "8vmin",
      10: "10vmin",
      12: "12vmin",
      16: "16vmin",
      20: "20vmin",
      24: "24vmin",
      32: "32vmin",
      40: "40vmin",
      48: "48vmin",
      56: "56vmin",
      64: "64vmin",
      98: "98vmin",
      px: "1px",
      "left-pane": "var(--left-pane-width)",
    },

    borderRadius: {
      sm: "calc(var(--dialog-border-radius) * .1)",
      md: "calc(var(--dialog-border-radius) * .25)",
      l: "var(--dialog-border-radius)",
      full: "100%",
      inner: "var(--inner-border-radius)",
    },

    fontFamily: {
      sans: ["Fira Sans", "sans-serif"],
      mono: ["Fira Code", "monospace"],
      vt: ["VT323", "monospace"],
    },

    extend: {
      filter: {
        "image-stroke": "var(--image-stroke)",
        "image-drop-shadow": "var(--image-shadow)",
      },
      boxShadow: {
        "cell-inset":
          "inset 0 0 0 var(--inventory-cell-gap) var(--cell-inset-border-color), inset 0 0.5vmin 0 rgb(0 0 0 / 5%), 0 0 0 var(--inventory-cell-gap) var(--cell-inset-highlight-color)",
        "cell-inset-dark":
          "inset 0 0 0 var(--inventory-cell-gap) var(--cell-inset-border-color-dark)",
      },

      textShadow: {
        bordered:
          "var(--text-shadow-size) 0 rgb(0 0 0 / 100%), 0 var(--text-shadow-size) rgb(0 0 0 / 100%), var(--text-shadow-size-negative) 0 rgb(0 0 0 / 100%), 0 var(--text-shadow-size-negative) rgb(0 0 0 / 100%), var(--text-shadow-size-negative) var(--text-shadow-size-negative) rgb(0 0 0 / 100%), var(--text-shadow-size-negative) var(--text-shadow-size) rgb(0 0 0 / 100%), var(--text-shadow-size) var(--text-shadow-size-negative) rgb(0 0 0 / 100%), var(--text-shadow-size) var(--text-shadow-size) rgb(0 0 0 / 100%)",
        drop: "var(--text-drop-shadow)",
      },
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "text-shadow": (value) => ({
            textShadow: value,
          }),
        },
        { values: theme("textShadow") }
      );
    }),

    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          filter: (value) => ({
            filter: value,
          }),
        },
        { values: theme("filter") }
      );
    }),
  ],
};
