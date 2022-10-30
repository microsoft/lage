// @ts-check
const { ESLint } = require("eslint");
const PROJECT_ROOT = require("path").resolve(__dirname, "..", "..");
const { readFile } = require("fs/promises");

const path = require("path");

module.exports = async function run(data) {
  const { target } = data;
  const packageJson = JSON.parse(await readFile(path.join(target.cwd, "package.json"), "utf8"));

  if (!packageJson.scripts?.[target.task]) {
    process.stdout.write(`No script found for ${target.task} in ${target.cwd}... skipped`);
    // pass
    return;
  }

  const baseConfig = require(path.join(PROJECT_ROOT, "scripts/config/eslintrc.js"));
  baseConfig.parserOptions.project = path.join(target.cwd, "tsconfig.json");

  const shouldFix = process.env.ESLINT_FIX === "true"

  const eslint = new ESLint({
    reportUnusedDisableDirectives: "error",
    baseConfig,
    fix: shouldFix,
    cache: false,
    cwd: target.cwd,
  });

  const files = "src/**/*.ts";
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(results);

  // 3. Modify the files with the fixed code.
  await ESLint.outputFixes(results);

  // 4. Output it.
  if (resultText) {
    process.stdout.write(resultText + "\n");
  }

  if (results.some((r) => r.errorCount > 0)) {
    throw new Error(`Linting failed with errors`);
  }
};
