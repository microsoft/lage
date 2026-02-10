// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, "..");
const runnerDir = path.resolve(packageRoot, "../runners/lib");
const outdir = "dist";

fs.rmSync(path.join(packageRoot, outdir), { recursive: true, force: true });

console.log("Bundling with esbuild...");

await esbuild.build({
  entryPoints: {
    lage: "@lage-run/cli/lib/cli.js",
    "lage-server": "@lage-run/cli/lib/server.js",
    main: "./index.js",
    "workers/targetWorker": "@lage-run/scheduler/lib/workers/targetWorker.js",
    singleTargetWorker: "@lage-run/cli/lib/commands/server/singleTargetWorker.js",
    // Bundle the runners instead of simply copying, in case they reference other files
    ...Object.fromEntries(
      fs
        .readdirSync(runnerDir)
        .filter((file) => file.endsWith("Runner.js"))
        .map((runner) => {
          const name = path.basename(runner, ".js");
          return [`runners/${name}`, `@lage-run/runners/lib/${runner}`];
        })
    ),
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
  logLevel: "info",
});

// Add a shebang to the executable files
for (const bin of ["lage", "lage-server"]) {
  const filePath = path.join(packageRoot, outdir, bin + ".js");
  const content = fs.readFileSync(filePath, "utf8");
  fs.writeFileSync(filePath, "#!/usr/bin/env node\n" + content);
}

console.log("Bundling succeeded\n");
