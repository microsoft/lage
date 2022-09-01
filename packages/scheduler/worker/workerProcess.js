// @ts-check

/** @typedef {import("@lage-run/target-graph").Target} Target **/
/** @typedef {import("workerpool").WorkerPool} WorkerPool **/
/** @typedef {[id: string, script: string, options: string]} WorkerProcessArgs */

const workerpool = require("workerpool");

/** @type {WorkerPool} */
let pool;

/**
 * Main worker process entrypoint.
 * @param {string[]} args
 */
async function main(args) {
  if (args.length !== 3) {
    throw new Error(`Invalid arguments sent to the worker process script ${args.join(" ")}`);
  }

  const [id, script, optionsJSON] = /** @type {WorkerProcessArgs} */ args;
  const options = JSON.parse(optionsJSON);

  pool = workerpool.pool(script, options);

  process.on("message", onMessage);
}

async function onMessage(message) {
  if (!pool || !process.send) {
    throw new Error("Pool not initialized");
  }

  if (message.type === "run" && message.target && pool) {
    const target = /** @type {Target} */ message.target;
    let status = "success";
    let statusMessage = "";
    try {
      await pool.exec("run", [target]);
    } catch (error) {
      status = "error";
      statusMessage = String(error);
    }

    process.send({ type: "status", status, target, message: statusMessage });
  }

  if (message.type === "cleanup") {
    pool.terminate();
    process.exit(0);
  }
}

main(process.argv.slice(2)).catch((error) => {
  process.stderr.write(String(error));
  process.exitCode = 1;
});
