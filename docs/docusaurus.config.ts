import type { Options as ClientRedirectsOptions } from "@docusaurus/plugin-client-redirects";
import type {
  Options as ClassicPresetOptions,
  ThemeConfig as ClassicThemeConfig,
} from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { createRequire } from "module";
import { themes as prismThemes } from "prism-react-renderer";
import tailwindcss from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);

const config: Config = {
  title: "Lage",
  tagline: "A Beautiful JS Monorepo Task Runner",
  url: process.env.DEPLOY_URL || "https://microsoft.github.io",
  baseUrl: "/lage/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
  // no longer exists
  // favicon: "/img/lage-logo.svg",
  organizationName: "microsoft",
  projectName: "lage",

  markdown: {
    mermaid: true,
  },

  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          editUrl: "https://github.com/microsoft/lage/edit/master/docs",
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.css")],
        },
      } satisfies ClassicPresetOptions,
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
          docId: "introduction",
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
      respectPrefersColorScheme: true,
    },
    prism: {
      theme: {
        ...prismThemes.vsLight,
        plain: {
          color: prismThemes.vsLight.plain.color,
          backgroundColor: prismThemes.oneLight.plain.backgroundColor,
        },
      },
      darkTheme: prismThemes.vsDark,
    },
  } satisfies ClassicThemeConfig,

  plugins: [
    "@cmfcmf/docusaurus-search-local",
    [
      "@docusaurus/plugin-client-redirects",
      {
        createRedirects: (path) => {
          // Redirects for old URLs (don't need to bother with casing changes)
          if (path.startsWith("/docs/guides/")) {
            return path.replace("/docs/guides/", "/docs/tutorial/");
          }
          if (path === "/docs/quick-start") {
            return "/docs/Quick Start";
          }
        },
      } satisfies ClientRedirectsOptions,
    ],
    () => ({
      name: "docusaurus-tailwindcss",
      configurePostCss(postcssOptions) {
        postcssOptions.plugins.push(tailwindcss);
        return postcssOptions;
      },
    }),
  ],
};

export default config;
