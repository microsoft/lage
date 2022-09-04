import type { TargetRunner } from "../types/TargetRunner";

export const NoOpRunner: TargetRunner = {
  async run() {
    // pass
  },
};
