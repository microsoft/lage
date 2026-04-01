// @ts-check
// Per-package ESLint overrides (only rule overrides; the base config is applied by the lint worker).
// For the editor, these overrides are duplicated in the root eslint.config.js using files patterns.

/** @type {import("eslint").Linter.Config[]} */
const config = [{ rules: { "no-console": "off" } }];

module.exports = config;
