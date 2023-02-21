// @ts-check
const path = require("path");

module.exports = {
  pipeline: {
    build: [],
    test: [],
    lint: [],
  },
  npmClient: "yarn",
  cacheOptions: {
    environmentGlob: [
      "beachball.config.js",
      "lage.config.js",
      "package.json",
      "renovate.json5",
      ".github/**",
      "packages/tsconfig.lage2.json",
      "patches",
    ],
  },
};
