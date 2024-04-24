// This is only used to enable eslint in the editor
module.exports = {
  ...require("@lage-run/monorepo-scripts/config/eslintrc"),
  parserOptions: {
    project: "./tsconfig.json",
  },
  ignorePatterns: ["**/*.js", "tests"],
  root: true,
};
