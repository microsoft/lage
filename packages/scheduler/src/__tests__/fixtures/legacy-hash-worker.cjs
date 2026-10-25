const { parentPort } = require("node:worker_threads");
const { registerWorker } = require("@lage-run/worker-threads-pool");

if (!parentPort) {
  throw new Error("This fixture must run in a Worker");
}
const port = parentPort;

/** @type {(hash: string | undefined) => void} */
let resolveHash = () => {
  throw new Error("No hash request is pending");
};
port.on("message", (message) => {
  if (message.type === "hash") {
    resolveHash(message.hash);
  }
});

registerWorker(async ({ target }) => {
  const hash = await new Promise((resolve) => {
    resolveHash = resolve;
    port.postMessage({ type: "hash" });
  });
  return { id: target.id, hash, skipped: !!hash };
});
