import { parentPort } from "worker_threads";
import { AbortController } from "abort-controller";
import { endMarker, END_MARKER_PREFIX, startMarker, START_MARKER_PREFIX } from "./stdioStreamMarkers";
import type { AbortSignal } from "abort-controller";

export function registerWorker(fn: (data: any, abortSignal?: AbortSignal) => Promise<void> | void) {
  parentPort?.on("message", async (message) => {
    let abortController: AbortController | undefined;

    switch (message.type) {
      case "start":
        abortController = new AbortController();
        return message.task && (await start(message.id, message.task, abortController.signal));

      case "abort":
        return abortController?.abort();
    }
  });

  async function start(workerTaskId: string, task: any, abortSignal?: AbortSignal) {
    try {
      process.stdout.write(`${startMarker(workerTaskId)}\n`);
      process.stderr.write(`${startMarker(workerTaskId)}\n`);
      const results = await fn(task, abortSignal);
      parentPort?.postMessage({ err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ err, results: undefined });
    } finally {
      process.stdout.write(`${endMarker(workerTaskId)}\n`);
      process.stderr.write(`${endMarker(workerTaskId)}\n`);
    }
  }
}
