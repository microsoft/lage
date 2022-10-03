import { parentPort } from "worker_threads";
import { AbortController } from "abort-controller";
import { END_WORKER_STREAM_MARKER, START_WORKER_STREAM_MARKER } from "./stdioStreamMarkers";
import type { AbortSignal } from "abort-controller";

export function registerWorker(fn: (data: any, abortSignal?: AbortSignal) => Promise<void> | void) {
  parentPort?.on("message", async (message) => {
    let abortController: AbortController | undefined;

    switch (message.type) {
      case "start":
        abortController = new AbortController();
        return message.task && (await start(message.task, abortController.signal));
      case "abort":
        return abortController?.abort();
    }
  });

  async function start(task: any, abortSignal?: AbortSignal) {
    try {
      process.stdout.write(`${START_WORKER_STREAM_MARKER}\n`);
      process.stderr.write(`${START_WORKER_STREAM_MARKER}\n`);
      const results = await fn(task, abortSignal);
      parentPort?.postMessage({ err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ err, results: undefined });
    } finally {
      

      process.stdout.write(`${END_WORKER_STREAM_MARKER}\n`);
      process.stderr.write(`${END_WORKER_STREAM_MARKER}\n`);
    }
  }
}
