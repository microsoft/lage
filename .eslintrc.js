const path = require("path");

// This is only used to enable eslint in the editor
module.exports = {
  ...require("./scripts/config/eslintrc"),
  parserOptions: {
    project: path.join(__dirname, "./scripts/config/tsconfig.eslint.json"),
  },
  ignorePatterns: ["**/*.js", "**/__fixtures__", "**/hasher/src/__tests__", "docs", "packages/*/scripts", "packages/*/src/gen", "lib/", "dist/"],
};
