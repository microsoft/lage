import { registerWorker } from "@lage-run/worker-threads-pool";
import { NpmScriptRunner } from "../runners/NpmScriptRunner";
import { TargetRunnerPicker } from "../runners/TargetRunnerPicker";
import { TargetRunner } from "../types/TargetRunner";
import { findNpmClient } from "@lage-run/find-npm-client";
import { workerData } from "node:worker_threads";
import createLogger from "@lage-run/logger";
import type { LogLevel } from "@lage-run/logger";
import { WorkerReporter } from "./WorkerReporter";
import { WorkerRunner } from "../runners/WorkerRunner";

function setup(options: { taskArgs: string[]; nodeargs: string; npmClient: string; logLevel: LogLevel }) {
  const { taskArgs, nodeargs, npmClient, logLevel } = options;

  const logger = createLogger();
  logger.addReporter(
    new WorkerReporter({
      logLevel,
    })
  );

  const runners: Record<string, TargetRunner> = {
    npmScript: new NpmScriptRunner({
      logger,
      nodeOptions: nodeargs,
      taskArgs,
      npmCmd: findNpmClient(npmClient),
    }),

    worker: new WorkerRunner({
      logger,
    }),
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
