import path from "path";
import { getStartTargetId } from "@lage-run/target-graph";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunner } from "@lage-run/scheduler-types";

export interface TargetRunnerPickerOptions {
  [key: string]: { script: string; options: any };
}

export class TargetRunnerPicker {
  constructor(private options: TargetRunnerPickerOptions) {}

  async pick(target: Target): Promise<TargetRunner> {
    if (target.id === getStartTargetId()) {
      return (await import("./NoOpRunner.js")).NoOpRunner;
    }

    if (!target.type) {
      target.type = "npmScript";
    }

    if (this.options[target.type]) {
      const config = this.options[target.type];
      const { script, options } = config;

      const runnerModule = await import(script);

      const base = path.basename(script);
      const runnerName = base.replace(path.extname(base), "");

      const runner =
        typeof runnerModule[runnerName] === "function"
          ? runnerModule[runnerName]
          : typeof runnerModule.default === "function"
          ? runnerModule.default
          : typeof runnerModule.default[runnerName] === "function"
          ? runnerModule.default[runnerName]
          : runnerModule;

      return new runner(options);
    }

    throw new Error(`No runner found for target ${target.id}`);
  }
}
