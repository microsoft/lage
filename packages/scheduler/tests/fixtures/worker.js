// Fixture uses the `workerpool`
const { registerWorker } = require("@lage-run/worker-threads-pool");
const { threadId } = require("worker_threads");

function run({ target }) {
  console.log(`Thread: ${threadId}, Target: ${target.id}`);
}

registerWorker(run);
