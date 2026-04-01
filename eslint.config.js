// @ts-check
const path = require("path");
const { createConfig } = require("./scripts/config/eslint.config.js");

module.exports = [
  ...createConfig({
    tsconfigPath: path.join(__dirname, "scripts/config/tsconfig.eslint.json"),
  }),

  // Per-package overrides
  {
    files: ["packages/workspace-tools/**/*.ts", "packages/grapher/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
