module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "file-extension-in-import-ts"],
  reportUnusedDisableDirectives: true,
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-empty-function": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-require-imports": "error",
    "no-console": "error",
    "file-extension-in-import-ts/file-extension-in-import-ts": "error",
    '@typescript-eslint/no-floating-promises': 'error',
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  root: true,
};
