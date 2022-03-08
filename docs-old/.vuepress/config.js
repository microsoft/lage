module.exports = {
  title: "lage",
  description: "Monorepo task runner as beautiful as the Norwegian fjords",
  base: "/lage/",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "GitHub", link: "https://github.com/microsoft/lage" },
    ],
    sidebar: [
      "/",
      "/guide/",
      "/guide/getting-started",
      "/guide/levels",
      "/guide/scopes",
      "/guide/cache",
      "/guide/remote-cache",
      "/guide/pipeline",
      "/guide/profile",
      "/guide/priority",
      "/guide/config",
      "/guide/cli",
      "/guide/migration"
    ],
  },
  plugins: [
    [
      "mermaidjs",
      {
        gantt: {
          barHeight: 20,
          fontSize: 12,
          useWidth: 960,
        },
      },
    ],
  ],
};
