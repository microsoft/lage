// Fixture uses the `workerpool`
const workerpool = require("workerpool");
const {threadId} = require("worker_threads");

function run(target, _abortSignal) {
  console.log(`Thread: ${threadId}, Target: ${target.id}`);
}

workerpool.worker({
  run,
});
