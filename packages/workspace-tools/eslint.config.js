// @ts-check
const path = require("path");
const { createConfig } = require("../../scripts/config/eslint.config.js");

module.exports = [
  ...createConfig({ tsconfigPath: path.join(__dirname, "tsconfig.json") }),
  { rules: { "no-console": "off" } },
];
