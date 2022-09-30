import { parentPort } from "node:worker_threads";

export function registerWorker(fn: (data: any) => Promise<void> | void) {
  parentPort?.on("message", async (task) => {
    try {
      process.stdout.write(`## WORKER:START:${task.target.id}\n`);
      process.stderr.write(`## WORKER:START:${task.target.id}\n`);
      const results = await fn(task);
      parentPort?.postMessage({ err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ err, results: undefined });
    } finally {
      process.stdout.write(`## WORKER:END:${task.target.id}\n`);
      process.stderr.write(`## WORKER:END:${task.target.id}\n`);
    }
  });
}
