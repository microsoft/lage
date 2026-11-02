"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const {
  isMainThread,
  parentPort,
  Worker,
  workerData,
} = require("node:worker_threads");

function fail(error) {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
}

if (isMainThread) {
  main().catch(fail);
} else {
  runWorker().catch(fail);
}

async function main() {
  assert(process.argv[2], "Usage: node worker-lifecycle.cjs <addon-path>");
  const library = fs.realpathSync(process.argv[2]);
  const filename = path.basename(__filename);
  // A guaranteed miss still initializes the pool without depending on this script's timestamps.
  const fingerprint = "1:1:33188:0:100:100";
  const supportsRetention = [
    "win32",
    "darwin",
    "linux",
    "android",
    "freebsd",
    "dragonfly",
    "netbsd",
    "sunos",
    "illumos",
  ].includes(process.platform);
  const canonical = (file) => {
    const resolved = fs.realpathSync(file);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  };
  const mapped = () =>
    process.report.getReport().sharedObjects.some((file) => {
      if (
        path.basename(file).toLowerCase() !==
        path.basename(library).toLowerCase()
      ) {
        return false;
      }
      return canonical(file) === canonical(library);
    });

  // Loading the addon in this main thread would mask the Worker-only unload bug.
  assert.equal(
    mapped(),
    false,
    "The child main thread must start without the addon"
  );
  const timeout = setTimeout(() => {
    process.stderr.write("Worker lifecycle regression timed out\n");
    process.exit(1);
  }, 45000);
  timeout.unref();

  const runCase = async (mode, index) => {
    await new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: {
          library,
          cwd: __dirname,
          filename,
          fingerprint,
          mode,
        },
      });
      let ready = false;
      worker.on("message", (message) => {
        ready = message === "ready";
        if (ready && mode !== "natural") {
          worker.terminate().catch(reject);
        }
      });
      worker.once("error", reject);
      worker.once("exit", (code) => {
        try {
          assert(ready, `${mode} Worker exited without completing its setup`);
          assert.equal(
            code,
            mode === "natural" ? 0 : 1,
            `${mode} Worker exit code`
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
    if (supportsRetention) {
      assert(mapped(), `Addon was unloaded after ${mode} Worker ${index}`);
    }
  };

  try {
    // Start with queued work: a pin taken only inside compute() would be too late.
    for (let index = 0; index < 2; index++) {
      await runCase("queued", index);
    }
    for (let index = 0; index < 3; index++) {
      await runCase("natural", index);
    }
    for (let index = 0; index < 2; index++) {
      await runCase("active", index);
    }
    await runCase("natural", 3);
    process.stdout.write(
      "Worker lifecycle passed: 4 natural exits, 2 queued terminations, 2 active terminations\n"
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function runWorker() {
  const { library, cwd, filename, fingerprint, mode } = workerData;
  const addon = { exports: {} };
  process.dlopen(addon, library);
  const native = addon.exports;
  assert.equal(native.apiVersion, 1);

  if (mode === "queued") {
    // Occupy libuv while validateOutputs enqueues its task, then terminate immediately.
    const slots = Math.max(
      1,
      Math.min(32, Number(process.env.UV_THREADPOOL_SIZE) || 4)
    );
    for (let slot = 0; slot < slots; slot++) {
      crypto.pbkdf2(
        "worker-lifecycle",
        "queued-work",
        500000,
        32,
        "sha256",
        () => {}
      );
    }
    native.validateOutputs(cwd, [filename], [fingerprint]).catch(() => {});
  } else {
    assert.equal(
      await native.validateOutputs(cwd, [filename], [fingerprint]),
      false
    );
    if (mode === "active") {
      const paths = Array(512).fill(filename);
      const fingerprints = Array(512).fill(fingerprint);
      for (let batch = 0; batch < 4; batch++) {
        native.validateOutputs(cwd, paths, fingerprints).catch(() => {});
      }
    }
  }

  if (mode !== "natural") {
    parentPort.on("message", () => {});
  }
  parentPort.postMessage("ready");
}
