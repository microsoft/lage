// This is only used to enable eslint in the editor
module.exports = {
  ...require("./scripts/config/eslintrc"),
  parserOptions: {
    project: "./scripts/config/tsconfig.eslint.json",
  },
  ignorePatterns: ["**/*.js", "**/__fixtures__", "**/hasher/src/__tests__", "docs", "packages/*/scripts", "packages/*/src/gen"],
};
