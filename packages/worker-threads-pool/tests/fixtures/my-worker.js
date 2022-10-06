const { parentPort } = require("worker_threads");
const { AbortController } = require("abort-controller");

const START_WORKER_STREAM_MARKER = "## WORKER:START:";
const END_WORKER_STREAM_MARKER = "## WORKER:END:";

parentPort?.on("message", async (message) => {
  let abortController;

  switch (message.type) {
    case "start":
      abortController = new AbortController();
      return message.task && (await start(message.task, abortController.signal, message.id));

    case "abort":
      return abortController?.abort();
  }
});

function fn() {
  return Promise.resolve();
}

async function start(task, abortSignal, id) {
  try {
    process.stdout.write(`${START_WORKER_STREAM_MARKER}${id}\n`);
    process.stderr.write(`${START_WORKER_STREAM_MARKER}${id}\n`);
    const results = await fn(task, abortSignal);
    parentPort?.postMessage({ err: undefined, results });
  } catch (err) {
    parentPort?.postMessage({ err, results: undefined });
  } finally {
    process.stdout.write(`${END_WORKER_STREAM_MARKER}${id}\n`);
    process.stderr.write(`${END_WORKER_STREAM_MARKER}${id}\n`);
  }
}
