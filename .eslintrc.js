// @ts-check
const path = require("path");

// This is only used to enable eslint in the editor
/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: path.join(__dirname, "scripts/config/eslintrc.js"),
  parserOptions: {
    project: path.join(__dirname, "scripts/config/tsconfig.eslint.json"),
  },
};

module.exports = config;
