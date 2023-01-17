import type { TargetRunner } from "@lage-run/scheduler-types";

export const NoOpRunner: TargetRunner = {
  async shouldRun() {
    return true;
  },

  async run() {
    // pass
  },
};
