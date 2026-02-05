/** @import { Target } from "@/TargetGraph" */
/** @import { WorkerRunnerOptions } from "@/WorkerRunner" */
const { ESLint } = require("eslint");
const path = require("path");
const { getPackageInfo } = require("workspace-tools");

/**
 * The type here should be `WorkerRunnerOptions & TargetRunnerOptions`, but we only specify the
 * needed properties so the runner function can be reused by commands/lint.js.
 * @param {WorkerRunnerOptions & { target: Pick<Target, 'packageName' | 'cwd' | 'task'> }} data
 */
async function lint(data) {
  const { target, taskArgs } = data;
  const packageJson = getPackageInfo(target.cwd);

  if (!packageJson?.scripts?.[target.task]) {
    process.stdout.write(`No script found for ${target.task} in ${target.cwd}... skipped`);
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

  // 3. Modify the files with the fixed code.
  await ESLint.outputFixes(results);

  // 4. Output it.
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
