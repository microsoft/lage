// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, "..");
const runnerDir = path.resolve(packageRoot, "../runners/lib");
const outdir = "dist";
const runnerOutDir = path.join(packageRoot, outdir, "runners");

console.log("Bundling with esbuild...");

// Due to the fact that workers require the runner to be in the same directory, we need to copy the runners to the dist folder
fs.mkdirSync(runnerOutDir, { recursive: true });
for (const runner of fs.readdirSync(runnerDir)) {
  // By convention, only copy things that end with "Runner.js"
  if (runner.endsWith("Runner.js")) {
    const src = path.join(runnerDir, runner);
    const dest = path.join(runnerOutDir, runner);
    fs.copyFileSync(src, dest);
  }
}

await esbuild.build({
  entryPoints: {
    lage: "@lage-run/cli/lib/cli.js",
    "lage-server": "@lage-run/cli/lib/server.js",
    main: "./index.js",
    "workers/targetWorker": "@lage-run/scheduler/lib/workers/targetWorker.js",
    singleTargetWorker: "@lage-run/cli/lib/commands/server/singleTargetWorker.js",
  },
  outdir,
  bundle: true,
  platform: "node",
  target: ["node14"],
  sourcemap: true,
  external: [
    "fsevents",
    "glob-hasher",
    "./runners/NpmScriptRunner.js",
    "./runners/NoOpRunner.js",
    "./runners/WorkerRunner.js",
    "./workers/targetWorker",
    "./singleTargetWorker.js",
  ],
  minify: true,
});

// Add a shebang to the executable files
for (const bin of ["lage", "lage-server"]) {
  const filePath = path.join(packageRoot, outdir, bin + ".js");
  const content = fs.readFileSync(filePath, "utf8");
  fs.writeFileSync(filePath, "#!/usr/bin/env node\n" + content);
}

console.log("Bundling succeeded\n");
