module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "file-extension-in-import-ts"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "error",
    "file-extension-in-import-ts/file-extension-in-import-ts": "error"
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  root: true,
  
};
