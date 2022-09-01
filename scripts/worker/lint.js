// @ts-check
const { ESLint } = require("eslint");
const PROJECT_ROOT = require("path").resolve(__dirname, "..", "..");

const { WorkerRunner } = require("@lage-run/scheduler");
const { threadId } = require("node:worker_threads");
const { readFile } = require("fs/promises");

const path = require("path");

async function run(target) {
  console.log("My thread id is", threadId);

  const packageJson = JSON.parse(await readFile(path.join(target.cwd, "package.json"), "utf8"));
  if (!packageJson.scripts?.[target.task]) {
    // pass
    return;
  }

  const baseConfig = require(path.join(PROJECT_ROOT, "scripts/config/eslintrc.js"));
  baseConfig.parserOptions.project = path.join(target.cwd, "tsconfig.json");

  const eslint = new ESLint({
    reportUnusedDisableDirectives: "error",
    baseConfig,
    fix: false,
    cache: false,
    cwd: target.cwd,
  });

  const files = "src/**/*.ts";

  const results = await eslint.lintFiles(files);

  if (results[0].errorCount > 0) {
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = formatter.format(results);

    // 4. Output it.
    console.log(resultText);

    if (results[0].errorCount > 0) {
      throw new Error(`Linting failed with ${results[0].errorCount} errors`);
    }
  }
}

WorkerRunner.register(run);
