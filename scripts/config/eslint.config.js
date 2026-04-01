// @ts-check
const tseslint = require("typescript-eslint");
const eslintJs = require("@eslint/js");
const globals = require("globals");
// @ts-expect-error -- this plugin has no type declarations
const fileExtensionPlugin = require("eslint-plugin-file-extension-in-import-ts");

/**
 * Create the shared ESLint flat config for the lage monorepo.
 *
 * The old legacy config applied all rules (including @typescript-eslint rules) to both TS and
 * JS files, because the JS files in this repo are also type-checked via JSDoc. To replicate this,
 * we apply `tseslint.configs.recommended` to all files (not just TS) by stripping the `files`
 * restriction from the preset entries.
 *
 * @param {object} [options]
 * @param {string} [options.tsconfigPath] Path to tsconfig.json (default: "./tsconfig.json")
 * @returns {import("typescript-eslint").ConfigArray}
 */
function createConfig(options = {}) {
  return tseslint.config(
    // Global ignores
    {
      ignores: [
        "**/__fixtures__/**",
        "**/fixtures/**",
        "*.js",
        "*.cjs",
        "**/yarn.js",
        "docs/**",
        "packages/*/scripts/**",
        "packages/*/src/gen/**",
        "packages/*/*.js",
        "**/lib/**",
        "**/dist/**",
        "**/gen/**",
        "**/node_modules/**",
      ],
    },

    // Base eslint recommended rules
    eslintJs.configs.recommended,

    // TypeScript-eslint recommended: sets up parser/plugin for all files, applies
    // eslint-recommended TS overrides to TS files, and recommended TS rules to all files.
    ...tseslint.configs.recommended,

    // Custom rules and parser options for all files (both TS and JS, since JS files in
    // this repo are also type-checked via JSDoc and the TS parser).
    {
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.es2020,
        },
        parserOptions: {
          project: options.tsconfigPath || "./tsconfig.json",
        },
      },
      plugins: {
        "file-extension-in-import-ts": fileExtensionPlugin,
      },
      linterOptions: {
        reportUnusedDisableDirectives: "error",
      },
      rules: {
        "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/no-non-null-assertion": "off",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
        "@typescript-eslint/no-require-imports": "error",
        "no-console": "error",
        "file-extension-in-import-ts/file-extension-in-import-ts": "error",
        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            args: "after-used",
            ignoreRestSiblings: true,
            argsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/explicit-member-accessibility": [
          "error",
          {
            accessibility: "explicit",
            overrides: { constructors: "off" },
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
    },

    // Override for JS files
    {
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "@typescript-eslint/no-require-imports": "off",
        "@typescript-eslint/explicit-member-accessibility": "off",
        "no-console": "off",
      },
    },

    // Override for test files
    {
      files: ["**/*.test.ts"],
      rules: {
        "no-restricted-properties": [
          "error",
          ...["describe", "it", "test"]
            .map((func) => [
              { object: func, property: "only", message: "Do not commit .only() tests" },
              { object: func, property: "skip", message: "Do not commit .skip() tests" },
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
    }
  );
}

module.exports = { createConfig };
