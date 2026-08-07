// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPackageInfos } from "workspace-tools-npm";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const runnerDir = path.resolve(packageRoot, "../runners/src");
const outdir = "dist";

const internalPackages = Object.values(getPackageInfos(repoRoot)).filter((info) => !info.private);

fs.rmSync(path.join(packageRoot, outdir), { recursive: true, force: true });

console.log("Bundling with esbuild...");

await esbuild.build({
  absWorkingDir: packageRoot,
  // Point all entries to the source files
  entryPoints: {
    lage: "../cli/src/cli.ts",
    "lage-server": "../cli/src/server.ts",
    main: "./index.js",
    "workers/targetWorker": "../scheduler/src/workers/targetWorker.ts",
    singleTargetWorker: "../cli/src/commands/server/singleTargetWorker.ts",
    // Bundle the runners instead of simply copying, in case they reference other files
    ...Object.fromEntries(
      fs
        .readdirSync(runnerDir)
        .filter((file) => file.endsWith("Runner.ts"))
        .map((runner) => {
          const name = path.basename(runner, ".ts");
          return [`runners/${name}`, `../runners/src/${runner}`];
        })
    ),
  },
  // Alias all packages to their source files for better tree shaking
  // (aliases to packages which aren't referenced do nothing)
  alias: Object.fromEntries(internalPackages.map((pkg) => [pkg.name, `${pkg.name}/src/index.ts`])),
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
    "./workers/targetWorker.js",
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
