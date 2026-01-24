// This is the config file for `dts-bundle-generator`, which is basically like Rollup for dts files.
// https://github.com/timocov/dts-bundle-generator/blob/master/src/config-file/README.md
//
// Since `lage`'s config types are defined in `@lage-run/cli` (and its dependencies), and `lage` ships
// a bundle rather than installing dependencies, it's also necessary to bundle the types in case
// consumers want to use them in their own lage configs.
//
// Ideally we would only have a single dts bundle, but there are a couple problems:
// - `lage` types extend from `backfill-config` types, and there are some naming conflicts.
// - `lage` types sometimes reference or re-export `backfill-config` types under different names,
//   which isn't handled well by `dts-bundle-generator`.
//
// As a workaround, the `backfill-config` types are bundled in a separate file, and the imports
// in bundled `lage` types will be rewritten later (by scripts/update-dts-bundle.js) to point to
// the local `backfill-config` bundle file rather than the npm package.
//
// The update script also does some basic validation: mainly detecting if a new dep is used which
// needs to be added to one of the `inlinedLibraries` lists below.

// @ts-check
const path = require("path");
const { getPackageInfos } = require("workspace-tools");

/** @type {import('dts-bundle-generator/config-schema').OutputOptions} */
const commonOutputOptions = {
  // Only export the types which are explicitly exported in the original files
  // (rather than all types referenced by exported types)
  exportReferencedTypes: false,
  noBanner: true,
};

/** @type {import('dts-bundle-generator/config-schema').BundlerConfig} */
const config = {
  compilationOptions: {
    preferredConfigPath: require.resolve("@lage-run/monorepo-scripts/config/tsconfig.dts-bundle.json"),
  },
  entries: [
    {
      filePath: path.join(path.dirname(require.resolve("@lage-run/cli/package.json")), "lib/index.d.ts"),
      outFile: "./dist/index.d.ts",
      libraries: {
        // Inline any types from workspace packages into the dts bundle
        inlinedLibraries: Object.values(getPackageInfos(process.cwd()))
          .filter((p) => p.name !== "lage" && !p.private)
          .map((p) => p.name),
      },
      output: commonOutputOptions,
    },
    // See file comment for explanation of why this a second bundle is needed
    {
      filePath: path.join(path.dirname(require.resolve("backfill-config/package.json")), "lib/index.d.ts"),
      outFile: "./dist/backfill-config.d.ts",
      libraries: {
        // Note that backfill-config itself must be in this list, or references to files within the
        // package will be treated as external and preserved as imports.
        inlinedLibraries: [
          "backfill-config",
          "backfill-logger",
          "@azure/abort-controller",
          "@azure/core-auth",
          "@azure/core-http",
          "@azure/core-lro",
          "@azure/core-paging",
          "@azure/core-tracing",
          "@azure/core-util",
          "@azure/logger",
          "@azure/storage-blob",
        ],
      },
      output: commonOutputOptions,
      noCheck: true,
    },
  ],
};

module.exports = config;
