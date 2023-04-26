// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

/**
 * @typedef {import('@docusaurus/types').Config} DocusaurusConfig
 * @typedef {import('@docusaurus/types').PresetConfig} DocusaurusPresetConfig
 * @typedef {import('@docusaurus/preset-classic').Options} ClassicPresetOptions
 * @typedef {import('@docusaurus/preset-classic').ThemeConfig} ClassicThemeConfig
 * @typedef {import('remark-shiki-twoslash').Options} ShikiTwoslashOptions
 * @typedef {['classic', ClassicPresetOptions] | ['docusaurus-preset-shiki-twoslash', ShikiTwoslashOptions] | DocusaurusPresetConfig} PresetConfig
 * @typedef {Omit<DocusaurusConfig, 'presets' | 'themeConfig'> & {
 *   presets: PresetConfig[];
 *   themeConfig: ClassicThemeConfig;
 * }} Config
 */

/** @type {Config} */
const config = {
  title: "Lage",
  tagline: "A Beautiful JS Monorepo Task Runner",
  url: process.env.DEPLOY_URL || "https://microsoft.github.io",
  baseUrl: "/lage/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  favicon: "img/lage-logo.svg",
  organizationName: "microsoft", // Usually your GitHub org/user name.
  projectName: "lage", // Usually your repo name.
  customFields: {
    image: "img/lage.png",
  },

  presets: [
    [
      "classic",
      {
        docs: {
          editUrl: "https://github.com/microsoft/lage/",
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.css")],
        },
      },
    ],
    [
      "docusaurus-preset-shiki-twoslash",
      {
        themes: ["light-plus", "nord"],
      },
    ],
  ],

  themeConfig: {
    navbar: {
      logo: {
        alt: "Lage Logo",
        src: "img/lage.png",
      },
      items: [
        {
          type: "doc",
          docId: "Introduction",
          position: "left",
          label: "Guide",
        },
        {
          href: "https://github.com/microsoft/lage",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    colorMode: {
      disableSwitch: false,
    },
  },

  plugins: [
    require.resolve("@cmfcmf/docusaurus-search-local"),
    async function tailwindPlugin(context, options) {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          // Appends TailwindCSS and AutoPrefixer.
          postcssOptions.plugins.push(require("tailwindcss"));

          return postcssOptions;
        },
      };
    },
  ],
};

module.exports = config;
