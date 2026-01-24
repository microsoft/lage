import type { TargetRunner } from "./types/TargetRunner.js";

export class NoOpRunner implements TargetRunner {
  async shouldRun(): Promise<boolean> {
    return true;
  }

  async run(): Promise<void> {
    // pass
  }
}
