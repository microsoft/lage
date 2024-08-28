import type { TargetRunner } from "./types/TargetRunner.js";

export class NoOpRunner implements TargetRunner {
  async shouldRun() {
    return true;
  }

  async run() {
    // pass
  }
}
