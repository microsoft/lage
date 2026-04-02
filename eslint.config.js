// @ts-check
const { glob } = require("fast-glob");
const path = require("path");
const { createConfig, defaultSrcGlob } = require("./scripts/config/eslintConfig.js");

// This silly workaround could be avoided by adding an eslint.config.js for every package.
// Then just delete the root eslint config and it shouldn't run on files outside a package.
const packagesWithESLint = glob
  .sync("packages/*/eslint.config.js", { cwd: __dirname, absolute: true })
  .map((configPath) => path.basename(path.dirname(configPath)));

module.exports = createConfig({
  dirname: __dirname,
  files: [`packages/!(${packagesWithESLint.join("|")})/${defaultSrcGlob}`],
  overrides: [
    {
      ignores: ["benchmark/**", "docs/**", "packages/*/*.js", "./*.js", "packages/*/scripts/**"],
    },
  ],
});
