import type { ConfigOptions } from "../types/ConfigOptions";

export function getMaxWorkersPerTask(pipelineConfig: ConfigOptions["pipeline"], concurrency: number) {
  const maxWorkersPerTask = new Map<string, number>();

  let total = 0;

  for (const [task, taskConfig] of Object.entries(pipelineConfig)) {
    if (!Array.isArray(taskConfig) && !task.includes("#")) {
      const maxWorkerOption: number | undefined = taskConfig.maxWorkers ?? taskConfig.options?.maxWorkers;

      if (typeof maxWorkerOption === "undefined") {
        continue;
      }

      let maxWorkers: number = 0;

      if (typeof maxWorkerOption !== "number") {
        throw new Error(`Invalid maxWorkers value: ${maxWorkerOption}`);
      } else {
        maxWorkers = maxWorkerOption;
      }

      maxWorkersPerTask.set(task, maxWorkers);
      total += maxWorkers;
    }
  }

  // try to adjust the maxWorkersPerTask to fit the concurrency
  if (total > concurrency) {
    let newTotal = 0;
    for (const [task, maxWorkers] of maxWorkersPerTask.entries()) {
      const newMaxWorkers = Math.max(1, Math.floor((maxWorkers / total) * concurrency));
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
