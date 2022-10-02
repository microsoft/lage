const { parentPort } = require("worker_threads");

// this is a duplicate of what's found inside the worker-threads-pool registerWorker (can't import it from this .js file)
const START_WORKER_STREAM_MARKER = "## WORKER:START:";
const END_WORKER_STREAM_MARKER = "## WORKER:END:";

function fn() {
  return Promise.resolve();
}

parentPort?.on("message", async (task) => {
  try {
    process.stdout.write(`${START_WORKER_STREAM_MARKER}\n`);
    process.stderr.write(`${START_WORKER_STREAM_MARKER}\n`);
    const results = await fn(task);
    parentPort?.postMessage({ err: undefined, results });
  } catch (err) {
    parentPort?.postMessage({ err, results: undefined });
  } finally {
    process.stdout.write(`${END_WORKER_STREAM_MARKER}\n`);
    process.stderr.write(`${END_WORKER_STREAM_MARKER}\n`);
  }
});
