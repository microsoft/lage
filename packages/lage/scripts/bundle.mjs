import * as esbuild from "esbuild";

async function bundle(entry, outfile) {
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
      "./runners/NpmScriptRunner.js",
      "./workers/targetWorker",
      "./runners/NoOpRunner.js",
      "./runners/WorkerRunner.js",
    ],
    minify: true
  });
}

await Promise.all([
  bundle("@lage-run/cli/lib/cli.js", "dist/lage.js"),
  bundle("./index.js", "dist/main.js"),
  bundle("@lage-run/scheduler/lib/workers/targetWorker.js", "dist/workers/targetWorker.js"),
]);
