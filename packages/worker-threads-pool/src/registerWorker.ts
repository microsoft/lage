import { parentPort } from "node:worker_threads";

export function registerWorker(fn: (data: any) => Promise<void> | void) {
  parentPort?.on("message", async (task) => {
    // setTimeout are used below to allow streams to be read by the Logger's stream() API before the "success" or "error" results are posted
    try {
      const results = await fn(task);

      setTimeout(() => {
        parentPort?.postMessage({ err: undefined, results });
      }, 0);
    } catch (err) {
      setTimeout(() => {
        parentPort?.postMessage({ err, results: undefined });
      }, 0);
    }
  });
}
