// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Lage',
  tagline: 'A Beautiful JS Monorepo Task Runner',
  url: process.env.DEPLOY_URL ? process.env.DEPLOY_URL : 'https://microsoft.github.io',
  baseUrl: '/lage/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/lage-logo.svg',
  organizationName: 'microsoft', // Usually your GitHub org/user name.
  projectName: 'lage', // Usually your repo name.
  customFields:{
    image: 'img/lage.png'
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/microsoft/lage/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        logo: {
          alt: 'Lage Logo',
          src: 'img/lage.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'Introducing Lage/Overview',
            position: 'left',
            label: 'Guide',
          },
          {
            href: 'grapher',
            position: 'left',
            label: 'Grapher',
          },
          {
            href: 'https://github.com/microsoft/lage',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
      colorMode : {
        defaultMode: 'dark',
        disableSwitch: true
      },
    }),
};

module.exports = config;
