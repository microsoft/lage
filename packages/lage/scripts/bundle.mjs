import * as esbuild from "esbuild";
import alias from "esbuild-plugin-alias";

async function bundle(entry, outfile, addBanner = false) {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    target: ["node16"],
    outfile,
    sourcemap: true,
    external: [
      "fsevents",
      "glob-hasher",
      "./runners/NpmScriptsRunner.js",
      "./runners/NoOpRunner.js",
      "./runners/WorkerRunner.js",
      "./workers/targetWorker",
      "./singleTargetWorker.js"
    ],
    ...(addBanner && { banner: { js: "#!/usr/bin/env node" } }),
    minify: true,
  });
}

await Promise.all([
  bundle("@lage-run/cli/lib/cli.js", "dist/lage.js", true),
  bundle("@lage-run/cli/lib/server.js", "dist/lage-server.js", true),
  bundle("./index.js", "dist/main.js"),
  bundle("@lage-run/scheduler/lib/workers/targetWorker.js", "dist/workers/targetWorker.js"),
  bundle("@lage-run/cli/lib/commands/server/singleTargetWorker.js", "dist/singleTargetWorker.js")
]);
