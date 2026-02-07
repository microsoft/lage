import type { TargetRunner } from "./types/TargetRunner.js";

export class NoOpRunner implements TargetRunner {
  public async shouldRun(): Promise<boolean> {
    return true;
  }

  public async run(): Promise<void> {
    // pass
  }
}
