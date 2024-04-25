// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import { createRequire } from "module";
import path from "path";
import { findPackageRoot } from "workspace-tools";

const localRequire = createRequire(import.meta.url);

async function bundle() {
  console.log("\nBundling lage with esbuild...");

  const packageRoot = findPackageRoot(process.cwd()) || process.cwd();
  const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8"));

  // Mapping from output path (relative to dist, no extension) to input path (relative to package root)
  const entryPoints = {
    lage: "@lage-run/cli/lib/cli.js",
    main: "./index.js",
    "workers/targetWorker": "@lage-run/scheduler/lib/workers/targetWorker.js",
  };
  // List of external modules that should not be bundled
  const external = [
    // Externalize deps and optional deps, which are native packages
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.optionalDependencies),
    // Also don't re-bundle targetWorker from the other entry points
    "./workers/targetWorker",
  ];

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

  /** @type {import('esbuild').BuildOptions} */
  const esbuildOptions = {
    absWorkingDir: packageRoot,
    entryPoints,
    bundle: true,
    platform: "node",
    target: ["node16"],
    logLevel: "info",
    external,
  };

  // Minified build
  console.log("\nCreating minified bundles under dist");
  await esbuild.build({
    ...esbuildOptions,
    outdir: "dist",
    sourcemap: true,
    minify: true,
  });

  // Debug build
  console.log("\nCreating debug bundles under dist/debug");
  await esbuild.build({
    ...esbuildOptions,
    outdir: "dist/debug",
    minify: false,
  });
}

await bundle().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
