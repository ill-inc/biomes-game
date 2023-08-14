module.exports = {
  plugins: {
    tailwindcss: {
      // Required for Docusaurus: https://github.com/facebook/docusaurus/issues/6631https://github.com/facebook/docusaurus/issues/6631#issuecomment-1033469556
      content: ["./src/**/*.{html,js}"],
    },
    autoprefixer: {},
  },
};
