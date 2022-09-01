import { parentPort } from "node:worker_threads";

export function registerWorker(fn: (data: any) => void) {
  parentPort?.on("message", async (task) => {
    try {
      const results = await fn(task);
      parentPort?.postMessage({ err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ err, results: undefined });
    }
  });
}
