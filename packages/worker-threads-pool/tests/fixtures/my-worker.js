const { parentPort } = require("node:worker_threads");

parentPort?.on("message", async (task) => {
  try {
    const results = task;
    parentPort?.postMessage({ err: undefined, results });
  } catch (err) {
    parentPort?.postMessage({ err, results: undefined });
  }
});
