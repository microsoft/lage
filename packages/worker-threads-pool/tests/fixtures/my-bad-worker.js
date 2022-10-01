const { parentPort } = require("node:worker_threads");

// this is a duplicate of what's found inside the worker-threads-pool registerWorker (can't import it from this .js file)
const START_WORKER_STREAM_MARKER = "## WORKER:START:";
const END_WORKER_STREAM_MARKER = "## WORKER:END:";

parentPort?.on("message", async () => {
  process.stdout.write(`${START_WORKER_STREAM_MARKER}\n`);
  process.stderr.write(`${START_WORKER_STREAM_MARKER}\n`);
  parentPort?.postMessage({ err: "BAD", results: undefined });
  process.stdout.write(`${END_WORKER_STREAM_MARKER}\n`);
  process.stderr.write(`${END_WORKER_STREAM_MARKER}\n`);
});
