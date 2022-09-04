const { parentPort } = require("node:worker_threads");

parentPort?.on("message", async () => {
  parentPort?.postMessage({ err: "BAD", results: undefined });
});
