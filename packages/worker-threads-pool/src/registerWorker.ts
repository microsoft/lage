import { parentPort } from "node:worker_threads";
import { END_WORKER_STREAM_MARKER, START_WORKER_STREAM_MARKER } from "./stdioStreamMarkers";

export function registerWorker(fn: (data: any) => Promise<void> | void) {
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
