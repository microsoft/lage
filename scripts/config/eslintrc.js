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
    "/*.cjs",
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
    "@typescript-eslint/await-thenable": "error",
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-misused-promises": "error",
    "@typescript-eslint/require-await": "error",
    // enable after eslint upgrade:
    // "@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],
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
    "@typescript-eslint/explicit-member-accessibility": [
      "error",
      {
        accessibility: "explicit",
        overrides: {
          constructors: "off",
        },
      },
    ],
    "@typescript-eslint/no-shadow": "error",
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "node:test",
            message: 'You probably meant to import from "@jest/globals"',
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "no-console": "off",
      },
    },
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-restricted-properties": [
          "error",
          ...["describe", "it", "test"]
            .map((func) => [
              { object: func, property: "only", message: "Do not commit .only() tests" },
              { object: func, property: "skip", message: "Do not commit .skip() tests (disable this rule if needed)" },
            ])
            .flat(),
        ],
        "no-restricted-syntax": [
          "error",
          {
            message: "Do not commit disabled tests",
            selector: "CallExpression[callee.name=/^(xdescribe|xit|xtest)$/]",
          },
        ],
      },
    },
  ],
};

module.exports = config;
