// @ts-check
const { createConfig } = require("./scripts/config/eslintConfig.js");

module.exports = createConfig({
  dirname: __dirname,
  overrides: [
    {
      ignores: ["benchmark/**", "docs/**", "packages/*/*.js", "./*.js", "packages/*/scripts/**"],
    },
    // This should NOT override any rules!
    // Packages with overrides should get their own eslint config.
    // File types with overrides should go in createConfig.
  ],
});
