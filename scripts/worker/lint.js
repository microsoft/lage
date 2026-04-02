/** @import { Linter } from "eslint" */
/** @import { BasicWorkerRunnerFunction } from "../types.js" */
const { ESLint } = require("eslint");
const fs = require("fs");
const path = require("path");
const { getPackageInfo } = require("workspace-tools-npm");
const { createConfig } = require("../config/eslintConfig.js");

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
    return;
  }

  const shouldFix = taskArgs?.includes("--fix");

  // Use the per-package eslint.config.js if it exists (these extend the shared config),
  // otherwise create the default shared config for this package.
  const projectConfigPath = path.join(target.cwd, "eslint.config.js");
  /** @type {ESLint.Options} */
  const eslintOptions = { fix: shouldFix, cache: false, cwd: target.cwd };

  if (fs.existsSync(projectConfigPath)) {
    eslintOptions.overrideConfigFile = projectConfigPath;
  } else {
    // disable config file lookup so only baseConfig is used
    eslintOptions.overrideConfigFile = true;
    eslintOptions.baseConfig = /** @type {Linter.Config} */ (createConfig({ dirname: target.cwd }));
  }

  const eslint = new ESLint(eslintOptions);

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
