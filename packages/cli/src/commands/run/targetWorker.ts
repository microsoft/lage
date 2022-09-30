import { registerWorker } from "@lage-run/worker-threads-pool";
import { NpmScriptRunner } from "@lage-run/scheduler";
import { TargetRunnerPicker } from "@lage-run/scheduler";
import type { TargetRunner } from "@lage-run/scheduler";
import { findNpmClient } from "@lage-run/find-npm-client";
import { workerData } from "node:worker_threads";
import createLogger from "@lage-run/logger";
import { WorkerRunner } from "@lage-run/scheduler";
import { initializeReporters } from "@lage-run/reporters";
import type { ReporterInitOptions } from "@lage-run/reporters";

interface TargetWorkerDataOptions extends ReporterInitOptions {
  taskArgs: string[];
  nodeArg: string;
  npmClient: string;
}

function setup(options: TargetWorkerDataOptions) {
  const { taskArgs, nodeArg, npmClient } = options;

  const runners: Record<string, TargetRunner> = {
    npmScript: new NpmScriptRunner({
      nodeOptions: nodeArg,
      taskArgs,
      npmCmd: findNpmClient(npmClient),
    }),

    worker: new WorkerRunner({}),
  };

  const runnerPicker = new TargetRunnerPicker({
    runners,
  });

  return {
    runnerPicker,
  };
}

const { runnerPicker } = setup(workerData);

async function run(data) {
  const runner = runnerPicker.pick(data.target);
  await runner.run(data.target);
}

registerWorker(run);
