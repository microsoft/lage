import os from "os";
import type { ConfigOptions } from "../types/ConfigOptions";

export function getMaxWorkersPerTask(pipelineConfig: ConfigOptions["pipeline"], concurrency: number) {
  const maxWorkersPerTask = new Map<string, number>();

  let total = 0;

  for (const [task, taskConfig] of Object.entries(pipelineConfig)) {
    if (!Array.isArray(taskConfig) && !task.includes("#")) {
      const maxWorkerOption: string | number | undefined = taskConfig.maxWorkers ?? taskConfig.options?.maxWorkers;

      if (typeof maxWorkerOption === "undefined") {
        continue;
      }

      let maxWorkers: number = 0;

      if (typeof maxWorkerOption === "string") {
        if (maxWorkerOption.endsWith("%")) {
          maxWorkers = Math.floor(concurrency * (parseInt(maxWorkerOption, 10) / 100));
        } else {
          maxWorkers = parseInt(maxWorkerOption, 10);
        }
      } else {
        maxWorkers = maxWorkerOption;
      }

      maxWorkersPerTask.set(task, maxWorkers);
      total += maxWorkers;
    }
  }

  if (total > concurrency) {
    throw new Error(
      `Total maxWorkers (${total}) configured across all tasks exceeds concurrency (${concurrency}). Hint: use percent of concurrency to configure the maxWorkers like this: { maxWorkers: "50%" }`
    );
  }

  return maxWorkersPerTask;
}
