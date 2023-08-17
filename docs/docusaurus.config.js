// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Biomes",
  tagline:
    "An open source sandbox MMORPG built for the web using web technologies",
  favicon: "img/favicon.ico",
  url: "https://ill-inc.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  organizationName: "ill-inc", // GitHub org name.
  projectName: "biomes-game", // Repository name.
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
        },
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: "img/biomes-logo.png",
      navbar: {
        title: "Biomes",
        logo: {
          alt: "Biomes Logo",
          src: "img/b-logo-black.png",
          srcDark: "img/b-logo.png",
        },
        items: [
          {
            type: "docSidebar",
            sidebarId: "tutorialSidebar",
            position: "left",
            label: "Docs",
          },
          {
            href: "/faq",
            position: "left",
            label: "F.A.Q.",
          },
          {
            href: "/gameplay",
            position: "left",
            label: "Gameplay",
          },
          {
            href: "https://github.com/ill-inc/biomes-game",
            label: "GitHub",
            position: "right",
          },
          {
            href: "https://discord.gg/biomes",
            label: "Discord",
            position: "right",
          },
          {
            label: "X",
            href: "https://www.x.com/illdotinc",
            position: "right",
          },
        ],
      },
      footer: {
        style: "dark",
        links: [
          {
            title: "Resources",
            items: [
              {
                label: "Docs",
                to: "/docs/intro",
              },
              {
                label: "F.A.Q.",
                to: "/faq",
              },
              {
                label: "Gameplay",
                to: "/gameplay",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "Discord",
                href: "https://discord.gg/biomes",
              },
              {
                label: "X",
                href: "https://www.x.com/illdotinc",
              },
              {
                label: "GitHub",
                href: "https://github.com/ill-inc/biomes-game",
              },
            ],
          },
        ],
        copyright: `© ${new Date().getFullYear()} Global Illumination, Inc.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
