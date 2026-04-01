/** @import { BasicWorkerRunnerFunction } from "../types.js" */
const { ESLint } = require("eslint");
const fs = require("fs");
const path = require("path");
const { getPackageInfo } = require("workspace-tools-npm");
const { createConfig } = require("../config/eslint.config.js");

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

  const tsconfigPath = path.join(target.cwd, "tsconfig.json");
  const baseConfig = createConfig({ tsconfigPath });

  // Load per-package overrides if they exist (these intentionally only contain rule
  // overrides so that the editor's root eslint.config.js can work independently)
  const projectConfigPath = path.join(target.cwd, "eslint.config.js");
  if (fs.existsSync(projectConfigPath)) {
    const projectConfig = require(projectConfigPath);
    baseConfig.push(...projectConfig);
  }

  const shouldFix = taskArgs?.includes("--fix");

  const eslint = new ESLint({
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
