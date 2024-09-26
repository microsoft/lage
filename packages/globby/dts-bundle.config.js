// @ts-check
const path = require("path");

/** @type {import('dts-bundle-generator/config-schema').BundlerConfig} */
module.exports = {
  compilationOptions: {
    preferredConfigPath: path.join(__dirname, "tsconfig.json"),
  },
  entries: [
    {
      filePath: path.join(__dirname, "lib/index.d.ts"),
      outFile: "./dist/index.d.ts",
      libraries: {
        // Inline any types from workspace packages into the dts bundle
        inlinedLibraries: ['globby'],
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
