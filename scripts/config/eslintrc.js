module.exports = {
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "eslint-plugin-import"],
  rules: {
    "@typescript-eslint/consistent-type-imports": "error",
    "@typescript-eslint/consistent-type-exports": "error",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "error",
    "import/extensions": ["error", "ignorePackages"]
  },
  parserOptions: {
    project: "./tsconfig.json",
  },
  root: true,
  
};
