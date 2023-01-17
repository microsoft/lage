import { TargetRunner, TargetRunnerOptions } from "@lage-run/scheduler-types";
import fs from "fs";
import path from "path";
import { stat } from "fs/promises";
import { removeCacheEntry } from "../cacheDir";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export class PruneCacheRunner implements TargetRunner {
  async shouldRun() {
    return true;
  }
  async run(runOptions: TargetRunnerOptions): Promise<void> {
    const { target } = runOptions;

    console.log("Pruning cache for " + target.packageName);

    const { clearPaths, prunePeriod, now } = target.options!;

    for (const cachePath of clearPaths) {
      if (fs.existsSync(cachePath)) {
        const entries = fs.readdirSync(cachePath);

        for (const entry of entries) {
          const entryPath = path.join(cachePath, entry);
          const entryStat = await stat(entryPath);

          if (now - entryStat.mtime.getTime() > prunePeriod * MS_IN_A_DAY) {
            await removeCacheEntry(entryPath, entryStat);
          }
        }
      }
    }
  }
}
