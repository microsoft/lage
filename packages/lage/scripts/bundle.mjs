// @ts-check
import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getPackageInfos } from "workspace-tools-npm";
import { publishNativeBinary } from "../../backfill-cache/native/build.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(dirname, "..");
const repoRoot = path.resolve(packageRoot, "../..");
const runnerDir = path.resolve(packageRoot, "../runners/src");
const outdir = "dist";
const distDir = path.join(packageRoot, outdir);
const nativeOutdir = path.join(distDir, "native");

const internalPackages = Object.values(getPackageInfos(repoRoot)).filter((info) => !info.private);

// Keep the live native module until its verified replacement can be renamed into place.
if (fs.existsSync(distDir)) {
  for (const file of fs.readdirSync(distDir)) {
    if (file !== "native") {
      fs.rmSync(path.join(distDir, file), { recursive: true, force: true });
    }
  }
}

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

const nativeFilename = `cache-validator-${process.platform}-${process.arch}.node`;
const nativeSource = path.join(repoRoot, "packages", "backfill-cache", "lib", "native", nativeFilename);
const hasNative = fs.existsSync(nativeSource);
if (hasNative) {
  publishNativeBinary(nativeSource, path.join(nativeOutdir, nativeFilename));
  console.log(`Bundled native/${nativeFilename}`);
} else {
  console.warn("No optional native cache validator found; bundling with the portable JavaScript fallback.");
}
if (fs.existsSync(nativeOutdir)) {
  for (const file of fs.readdirSync(nativeOutdir)) {
    if (file.startsWith("cache-validator-") && file.endsWith(".node") && (!hasNative || file !== nativeFilename)) {
      fs.unlinkSync(path.join(nativeOutdir, file));
    }
  }
}

console.log("Bundling succeeded\n");
