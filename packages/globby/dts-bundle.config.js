// @ts-check
const getDtsBundleConfig = require("@lage-run/monorepo-scripts/config/getDtsBundleConfig");

module.exports = getDtsBundleConfig({
  entryFile: "./lib/index.d.mts",
  outFile: "./dist/index.d.ts",
  inlinedLibraries: ["fast-glob", "globby", /^@nodelib\//],
});
