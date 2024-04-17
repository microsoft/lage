const { parentPort } = require("worker_threads");

const START_WORKER_STREAM_MARKER = "## WORKER:START:";
const END_WORKER_STREAM_MARKER = "## WORKER:END:";

module.exports.registerWorker = function (fn) {
  parentPort?.on("message", async (message) => {
    let abortController;

    switch (message.type) {
      case "start":
        abortController = new AbortController();
        return message.task && (await start(message.task, abortController.signal, message.id));

      case "abort":
        return abortController?.abort();

      case "check-memory-usage":
        parentPort?.postMessage({ type: "report-memory-usage", memoryUsage: process.memoryUsage().heapUsed });
        break;
    }
  });

  async function start(task, abortSignal, id) {
    try {
      process.stdout.write(`${START_WORKER_STREAM_MARKER}${id}\n`);
      process.stderr.write(`${START_WORKER_STREAM_MARKER}${id}\n`);
      const results = await fn(task, abortSignal);
      parentPort?.postMessage({ type: "status", err: undefined, results });
    } catch (err) {
      parentPort?.postMessage({ type: "status", err, results: undefined });
    } finally {
      process.stdout.write(`${END_WORKER_STREAM_MARKER}${id}\n`);
      process.stderr.write(`${END_WORKER_STREAM_MARKER}${id}\n`);
    }
  }
};
