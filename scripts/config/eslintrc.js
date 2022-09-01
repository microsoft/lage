module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  root: true,
};
