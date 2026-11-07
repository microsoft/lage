import type { TargetRunner } from "./types/TargetRunner.js";

export class NoOpRunner implements TargetRunner {
  // eslint-disable-next-line @typescript-eslint/require-await
  public async shouldRun(): Promise<boolean> {
    return true;
  }

  public async run(): Promise<void> {
    // pass
  }
}
