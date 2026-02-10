// This is the config file for `dts-bundle-generator`, which is basically like Rollup for dts files.
// https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
//
// Since `lage`'s config types are defined in `@lage-run/cli` (and its dependencies), and `lage` ships
// a bundle rather than installing dependencies, it's also necessary to bundle the types in case
// consumers want to use them in their own lage configs.

// @ts-check
const getDtsBundleConfig = require("@lage-run/monorepo-scripts/config/getDtsBundleConfig");

module.exports = getDtsBundleConfig({
  entryFile: "../cli/lib/index.d.ts",
  outFile: "./dist/index.d.ts",
  inlinedLibraries: [
    // Inline any types from lage packages into the dts bundle
    /^@lage-run\//,
    // Also expected dependencies
    /^backfill-/,
  ],
});
