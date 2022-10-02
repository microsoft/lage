import { findNpmClient } from "@lage-run/find-npm-client";
import { NpmScriptRunner } from "../runners/NpmScriptRunner";
import { registerWorker } from "@lage-run/worker-threads-pool";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker";
import { workerData } from "worker_threads";
import { WorkerRunner } from "../runners/WorkerRunner";
import type { ReporterInitOptions } from "@lage-run/reporters";
import type { TargetRunner } from "@lage-run/scheduler-types";

interface TargetWorkerDataOptions {
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

    worker: new WorkerRunner(),
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
