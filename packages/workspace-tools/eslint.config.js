// @ts-check
const { createConfig } = require("../../scripts/config/eslintConfig.js");

module.exports = createConfig({
  dirname: __dirname,
  overrides: [
    {
      rules: {
        "no-console": "off",
      },
    },
  ],
});
