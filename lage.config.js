// @ts-check
const path = require("path");
const fastGlob = require("fast-glob");

module.exports = {
  pipeline: {
    build: [],
    test: [],
    lint: [],
    depcheck: {
      type: "worker",
      options: {
        worker: path.join(__dirname, "scripts/worker/depcheck.js"),
      },
    },
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
