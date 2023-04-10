import type { ConfigOptions } from "./types/ConfigOptions.js";

export function getMaxWorkersPerTask(pipelineConfig: ConfigOptions["pipeline"], concurrency: number) {
  const maxWorkersPerTask = new Map<string, number>();

  let generalPoolCount = 0;
  let generatelPoolMaxWorkers = 0;

  let dedicatedPoolCount = 0;
  let dedicatedPoolMaxWorkers = 0;

  for (const [task, taskConfig] of Object.entries(pipelineConfig)) {
    if (!Array.isArray(taskConfig) && !task.includes("#")) {
      const maxWorkerOption: number | undefined = taskConfig.maxWorkers ?? taskConfig.options?.maxWorkers;

      if (typeof maxWorkerOption === "undefined") {
        generalPoolCount++;
        continue;
      }

      let maxWorkers = 0;

      if (typeof maxWorkerOption !== "number") {
        throw new Error(`Invalid maxWorkers value: ${maxWorkerOption}`);
      } else {
        maxWorkers = maxWorkerOption;
      }

      maxWorkersPerTask.set(task, maxWorkers);
      dedicatedPoolCount++;
      dedicatedPoolMaxWorkers += maxWorkers;
    }
  }

  if (dedicatedPoolCount > 0 && generalPoolCount > 0) {
    const avgMaxWorkers = dedicatedPoolMaxWorkers / dedicatedPoolCount;
    generatelPoolMaxWorkers = Math.max(1, Math.floor(avgMaxWorkers * generalPoolCount));
  }

  const grandTotal = dedicatedPoolMaxWorkers + generatelPoolMaxWorkers;

  // try to adjust the maxWorkersPerTask to fit the concurrency
  if (grandTotal > concurrency) {
    let newTotal = 0;
    for (const [task, maxWorkers] of maxWorkersPerTask.entries()) {
      const newMaxWorkers = Math.max(1, Math.floor((maxWorkers / grandTotal) * concurrency));
      newTotal += newMaxWorkers;
      maxWorkersPerTask.set(task, newMaxWorkers);
    }

    if (newTotal > concurrency) {
      throw new Error(
        "Could not adjust maxWorkers per task to fit the concurrency, try reducing the maxWorkers, or increasing the --concurrency CLI argument, or separate the tasks to be run"
      );
    }
  }

  return maxWorkersPerTask;
}

export function getMaxWorkersPerTaskFromOptions(maxWorkersPerTask: string[]) {
  return new Map([
    ...maxWorkersPerTask.map((setting) => {
      const [task, maxWorkers] = setting.split(/[=:]/);
      return [task, parseInt(maxWorkers, 10)] as [string, number];
    }),
  ]);
}
