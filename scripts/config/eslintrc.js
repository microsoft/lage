/** @type {import('eslint').Linter.Config} */
const config = {
  root: true,
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  env: {
    node: true,
    es2020: true,
    jest: true,
  },
  plugins: ["@typescript-eslint", "file-extension-in-import-ts"],
  reportUnusedDisableDirectives: true,
  ignorePatterns: [
    // These might be relative to either a package or the repo root depending on whether eslint
    // is being run via the lint worker or in the editor
    "**/__fixtures__",
    "**/fixtures",
    "/*.js",
    "**/yarn.js",
    "docs",
    "packages/*/scripts",
    "packages/*/src/gen",
    "packages/*/*.js",
    "**/lib",
    "**/dist",
    "**/gen",
    "**/node_modules",
    "/node_modules",
  ],
  rules: {
    "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-require-imports": "error",
    "no-console": "error",
    "file-extension-in-import-ts/file-extension-in-import-ts": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/explicit-module-boundary-types": "error",
    "@typescript-eslint/no-unused-vars": [
      "error",
      {
        args: "after-used",
        ignoreRestSiblings: true,
        // Follow the typescript pattern of ignoring things starting with _
        argsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-require-imports": "off",
        "no-console": "off",
      },
    },
  ],
};

module.exports = config;
