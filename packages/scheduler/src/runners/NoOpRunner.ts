import type { TargetRunner } from "@lage-run/scheduler-types";

export const NoOpRunner: TargetRunner = {
  async run() {
    // pass
  },
};
