// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import { createRequire } from "module";
import path from "path";

const localRequire = createRequire(import.meta.url);

async function bundle() {
  console.log("\nBundling lage with esbuild...");

  // Mapping from output path (relative to dist, no extension) to input path (relative to package root)
  const entryPoints = {
    lage: "@lage-run/cli/lib/cli.js",
    main: "./index.js",
    "workers/targetWorker": "@lage-run/scheduler/lib/workers/targetWorker.js",
  };
  // List of external modules that should not be bundled
  const external = ["fsevents", "glob-hasher", "./workers/targetWorker"];

  // Due to the fact that workers require the runner to be in the same directory,
  // add the runners to the entry points, as well as the externals (so the file is preserved).
  const pkgToRunnerDir = {
    "@lage-run/scheduler": "lib/runners",
    "@lage-run/cli": "lib/commands/cache/runners",
  };
  for (const [pkg, runnerDir] of Object.entries(pkgToRunnerDir)) {
    const pkgPath = path.dirname(localRequire.resolve(`${pkg}/package.json`));
    for (const runner of fs.readdirSync(path.join(pkgPath, runnerDir))) {
      // By convention, only include things that end with "Runner.js"
      if (runner.endsWith("Runner.js")) {
        const runnerInput = `${pkgPath}/${runnerDir}/${runner}`;
        const runnerOutput = `runners/${runner}`;
        entryPoints[runnerOutput.replace(/\.js$/, "")] = runnerInput;
        external.push(`./${runnerOutput}`);
      }
    }
  }

  await esbuild.build({
    entryPoints,
    bundle: true,
    platform: "node",
    target: ["node16"],
    outdir: "dist",
    sourcemap: true,
    logLevel: "info",
    external,
    minify: true,
  });
}

await bundle().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
