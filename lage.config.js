// @ts-check
module.exports = {
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: ["build"],
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
