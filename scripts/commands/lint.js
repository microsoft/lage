const { ESLint } = require("eslint");
const packagePath = process.cwd();

(async function main() {
  // 1. Create an instance.
  const eslint = new ESLint({
    cwd: packagePath,
    baseConfig: require("../config/eslintrc.js"),
  });

  // 2. Lint files.
  const results = await eslint.lintFiles(["src/**/*.ts"]);

  // 3. Format the results.
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  // 4. Output it.
  console.log(resultText);

  if (results.some((r) => r.errorCount > 0)) {
    throw new Error(`Linting failed with ${results[0].errorCount} errors`);
  }
})().catch((error) => {
  process.exitCode = 1;
  console.error(error);
});
