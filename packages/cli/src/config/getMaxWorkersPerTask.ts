import os from "node:os";
import type { ConfigOptions } from "../types/ConfigOptions";

export function getMaxWorkersPerTask(pipelineConfig: ConfigOptions["pipeline"]) {
  const maxWorkersPerTask = new Map<string, number>();

  for (const [task, taskConfig] of Object.entries(pipelineConfig)) {
    if (!Array.isArray(taskConfig) && !task.includes("#")) {
      const maxWorkerOptions: string | number = taskConfig.options?.maxWorkers ?? os.cpus().length - 1;
      let maxWorkers = 0;
      if (typeof maxWorkerOptions === "string") {
        if (maxWorkerOptions.endsWith("%")) {
          maxWorkers = Math.floor((os.cpus().length - 1) * (parseInt(maxWorkerOptions, 10) / 100));
        } else {
          maxWorkers = parseInt(maxWorkerOptions, 10);
        }
      } else {
        maxWorkers = maxWorkerOptions;
      }

      maxWorkersPerTask.set(task, Math.min(maxWorkers, os.cpus().length - 1));
    }
  }

  return maxWorkersPerTask;
}
