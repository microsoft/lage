module.exports = {
  title: "lage",
  description: "Monorepo task runner as beautiful as the Norwegian fjords",
  base: "/lage/",
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/" },
      { text: "Github", link: "https://github.com/microsoft/lage" },
    ],
    sidebar: ["/", "/guide/", "/guide/levels", "/guide/config", "/guide/cli"],
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
