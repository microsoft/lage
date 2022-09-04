// @ts-check
const { ESLint } = require("eslint");
const PROJECT_ROOT = require("path").resolve(__dirname, "..", "..");

const { registerWorker } = require("@lage-run/worker-threads-pool");
const { readFile } = require("fs/promises");

const { threadId } = require("node:worker_threads");

const path = require("path");

async function run(data) {
  const { target } = data;
  const packageJson = JSON.parse(await readFile(path.join(target.cwd, "package.json"), "utf8"));

  if (!packageJson.scripts?.[target.task]) {
    process.stdout.write(`No script found for ${target.task} in ${target.cwd}\n`);
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
  const formatter = await eslint.loadFormatter("stylish");
  const resultText = formatter.format(results);

  // 4. Output it.
  process.stdout.write(resultText + "\n");

  if (results.some((r) => r.errorCount > 0)) {
    throw new Error(`Linting failed with errors`);
  }
}

registerWorker(run);
