// @ts-check
/** @import { ConfigArray } from "typescript-eslint" */
const tseslint = require("typescript-eslint");
const eslintJs = require("@eslint/js");
const globals = require("globals");
// @ts-expect-error -- this plugin has no type declarations
const fileExtensionPlugin = require("eslint-plugin-file-extension-in-import-ts");

/**
 * Create the shared ESLint flat config for the lage monorepo.
 *
 * @param {object} options
 * @param {string} options.dirname __dirname of the config file being created, used to resolve tsconfig paths
 * @param {boolean} [options.ignoreRootJsFiles] Whether to ignore .js files at the package root (default true).
 * By default, these are assumed to be config files that are ignored to avoid editor diagnostic errors.
 * @param {ConfigArray} [options.overrides] Additional config entries to append after the base config
 * @returns {ConfigArray}
 */
function createConfig(options) {
  return tseslint.config(
    // Global ignores (MUST be in a separate config object!)
    {
      name: "global ignores",
      ignores: [
        "**/__fixtures__/**",
        "**/fixtures/**",
        "bin/**",
        "lib/**",
        "dist/**",
        "temp/**",
        "scripts/**",
        "**/gen/**",
        "**/node_modules/**",
        // js files at the package root are usually configs
        ...(options.ignoreRootJsFiles !== false ? ["./*.js"] : []),
      ],
    },

    // Base eslint recommended rules
    eslintJs.configs.recommended,

    // TypeScript-eslint recommended: sets up parser/plugin for all files, applies
    // eslint-recommended TS overrides to TS files, and recommended TS rules to all files.
    // TODO: this should be recommendedTypeChecked + appropriate disables
    tseslint.configs.recommended,

    // Custom rules and parser options for all files (both TS and JS, since JS files in
    // this repo are also type-checked via JSDoc and the TS parser).
    {
      name: "base lage rules",
      languageOptions: {
        globals: {
          ...globals.node,
          ...globals.es2020,
        },
        parserOptions: {
          projectService: true,
          tsconfigRootDir: options.dirname,
        },
      },
      plugins: {
        "file-extension-in-import-ts": fileExtensionPlugin,
      },
      linterOptions: {
        reportUnusedDisableDirectives: "error",
      },
      rules: {
        "@typescript-eslint/ban-ts-comment": "off",
        "@typescript-eslint/no-empty-function": "off",
        "@typescript-eslint/no-explicit-any": "off",
        // TODO: should be enabled except in tests
        "@typescript-eslint/no-non-null-assertion": "off",

        "@typescript-eslint/await-thenable": "error",
        "@typescript-eslint/consistent-type-exports": "error",
        "@typescript-eslint/consistent-type-imports": ["error", { fixStyle: "inline-type-imports" }],
        "@typescript-eslint/explicit-member-accessibility": ["error", { accessibility: "explicit", overrides: { constructors: "off" } }],
        "@typescript-eslint/explicit-module-boundary-types": "error",
        "@typescript-eslint/no-floating-promises": "error",
        "@typescript-eslint/no-misused-promises": "error",
        "@typescript-eslint/no-require-imports": "error",
        "@typescript-eslint/no-restricted-imports": [
          "error",
          { paths: [{ name: "node:test", message: 'You probably meant to import from "@jest/globals"' }] },
        ],
        "@typescript-eslint/no-shadow": "error",
        "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true }],
        "@typescript-eslint/no-unused-vars": [
          "error",
          {
            args: "after-used",
            ignoreRestSiblings: true,
            argsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
          },
        ],
        "@typescript-eslint/require-await": "error",
        "@typescript-eslint/return-await": ["error", "error-handling-correctness-only"],
        "file-extension-in-import-ts/file-extension-in-import-ts": "error",
        "no-console": "error",
      },
    },

    // Override for JS files
    {
      name: "JS file overrides",
      files: ["**/*.{js,cjs,mjs}"],
      rules: {
        "@typescript-eslint/explicit-member-accessibility": "off",
        "@typescript-eslint/no-require-imports": "off",
        "no-console": "off",
        // copy these which are only applied from tseslint.configs.recommended to TS files
        "no-var": "error",
        "prefer-const": "error",
        "prefer-rest-params": "error",
        "prefer-spread": "error",
      },
    },

    // Override for test files
    {
      name: "test file overrides",
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
    },
    ...(options.overrides || [])
  );
}

module.exports = { createConfig };
