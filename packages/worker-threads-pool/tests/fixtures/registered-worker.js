import { parentPort } from "node:worker_threads";

// this is a duplicate of what's found inside the worker-threads-pool registerWorker (can't import it from this .js file)
export const START_WORKER_STREAM_MARKER = "## WORKER:START:";
export const END_WORKER_STREAM_MARKER = "## WORKER:END:";

export function registerWorker(fn) {
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
}
