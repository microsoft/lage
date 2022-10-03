import { getStartTargetId } from "@lage-run/target-graph";
import { NoOpRunner } from "./NoOpRunner";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunner } from "@lage-run/scheduler-types";

interface TargetRunnerPickerOptions {
  runners: { [key: string]: TargetRunner };
}

export class TargetRunnerPicker {
  constructor(private options: TargetRunnerPickerOptions) {}

  pick(target: Target): TargetRunner {
    if (target.id === getStartTargetId()) {
      return NoOpRunner;
    }

    if (!target.type) {
      target.type = "npmScript";
    }

    if (this.options.runners[target.type]) {
      return this.options.runners[target.type];
    }

    throw new Error(`No runner found for target ${target.id}`);
  }
}
