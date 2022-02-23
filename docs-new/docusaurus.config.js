// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Lage',
  tagline: 'A Beautiful JS Monorepo Task Runner',
  url: 'https://microsoft.github.io',
  baseUrl: '/lage/docs-new/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'microsoft', // Usually your GitHub org/user name.
  projectName: 'lage', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: 'https://github.com/microsoft/lage/docs-new',
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
        title: 'Lage',
        items: [
          {
            type: 'doc',
            docId: 'Introducing Lage/Overview',
            position: 'left',
            label: 'Guide',
          },
          {
            href: 'https://github.com/microsoft/lage',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Contributing',
            items: [
              {
                label: 'Contributing to Lage',
                to: '/docs/Contributing/contribution-guide',
              },
            ],
          }
        ]
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
