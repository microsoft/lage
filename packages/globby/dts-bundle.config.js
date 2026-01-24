// @ts-check
const path = require("path");

/** @type {import('dts-bundle-generator/config-schema').BundlerConfig} */
const config = {
  compilationOptions: {
    preferredConfigPath: require.resolve("@lage-run/monorepo-scripts/config/tsconfig.dts-bundle.json"),
  },
  entries: [
    {
      filePath: path.join(__dirname, "lib/index.d.ts"),
      outFile: "./dist/index.d.ts",
      libraries: {
        // Inline any types from workspace packages into the dts bundle
        inlinedLibraries: ["globby"],
      },
      output: {
        // Only export the types which are explicitly exported in the original files
        // (rather than all types referenced by exported types)
        exportReferencedTypes: true,
        noBanner: true,
      },
    },
  ],
};
module.exports = config;
