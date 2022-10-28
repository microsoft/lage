import { parentPort } from "worker_threads";
import { AbortController } from "abort-controller";
import { endMarker, startMarker } from "./stdioStreamMarkers";

import type { AbortSignal } from "abort-controller";
import type { MessagePort } from "worker_threads";

export function registerWorker(fn: (data: any, abortSignal?: AbortSignal) => Promise<void> | void) {
  parentPort?.on("message", async (message) => {
    let abortController: AbortController | undefined;

    switch (message.type) {
      case "start":
        abortController = new AbortController();
        return message.task && (await start(message.id, message.task, abortController.signal));

      case "abort":
        return abortController?.abort();

      case "check-memory-usage":
        return reportMemory(parentPort!);
    }
  });

  async function start(workerTaskId: string, task: any, abortSignal?: AbortSignal) {
    try {
      process.stdout.write(`${startMarker(workerTaskId)}\n`);
      process.stderr.write(`${startMarker(workerTaskId)}\n`);
      const results = await fn(task, abortSignal);
      parentPort?.postMessage({ type: "status", err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ type: "status", err, results: undefined });
    } finally {
      process.stdout.write(`${endMarker(workerTaskId)}\n`);
      process.stderr.write(`${endMarker(workerTaskId)}\n`);
    }
  }

  function reportMemory(port: MessagePort) {
    const message = {
      type: "report-memory-usage",
      memoryUsage: process.memoryUsage().heapUsed,
    };
    port.postMessage(message);
  }
}
