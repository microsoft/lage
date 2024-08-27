import type { TargetRunner } from "@lage-run/scheduler-types";

export class NoOpRunner implements TargetRunner {
  async shouldRun() {
    return true;
  }

  async run() {
    // pass
  }
}
