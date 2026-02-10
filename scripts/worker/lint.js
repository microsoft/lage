/** @import { BasicWorkerRunnerFunction } from "../types.js" */
const { ESLint } = require("eslint");
const path = require("path");
const { getPackageInfo } = require("workspace-tools");

/**
 * This worker is used for `lage run lint`, in place of the per-package `lint` script.
 *
 * Since this worker function has some extra logic/config, it's reused by the per-package `lint` script
 * (`monorepo-scripts lint` which runs commands/lint.js) to avoid duplication.
 *
 * @type {BasicWorkerRunnerFunction}
 */
async function lint(data) {
  const { target, taskArgs } = data;
  const packageJson = getPackageInfo(target.cwd);

  if (!packageJson?.scripts?.lint) {
    process.stdout.write('No "lint" script found - skipping');
    // pass
    return;
  }

  const baseConfig = require("../config/eslintrc.js");
  (baseConfig.parserOptions ??= {}).project = path.join(target.cwd, "tsconfig.json");

  const shouldFix = taskArgs?.includes("--fix");

  const eslint = new ESLint({
    reportUnusedDisableDirectives: "error",
    baseConfig,
    fix: shouldFix,
    cache: false,
    cwd: target.cwd,
  });

  const files = target.packageName === "@lage-run/monorepo-scripts" ? ["."] : ["src"];
  const results = await eslint.lintFiles(files);
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = await formatter.format(results);

  await ESLint.outputFixes(results);

  if (resultText) {
    process.stdout.write(resultText + "\n");
  }

  const hasErrors = results.some((r) => r.errorCount > 0);
  const hasWarnings = results.some((r) => r.warningCount > 0);
  if (hasErrors || hasWarnings) {
    throw new Error(`Linting failed with ${hasErrors ? "errors" : "warnings"}`);
  }
}

module.exports = lint;
