import { TargetRunner, TargetRunnerOptions } from "@lage-run/scheduler-types";
import fs from "fs";
import path from "path";
import { stat } from "fs/promises";
import { removeCacheEntry } from "../cacheDir";

export class ClearCacheRunner implements TargetRunner {
  async shouldRun() {
    return true;
  }
  async run(runOptions: TargetRunnerOptions): Promise<void> {
    const { target } = runOptions;

    console.log("Clearing cache for " + target.packageName);

    const { clearPaths } = target.options!;

    for (const cachePath of clearPaths) {
      if (fs.existsSync(cachePath)) {
        const entries = fs.readdirSync(cachePath);

        for (const entry of entries) {
          const entryPath = path.join(cachePath, entry);
          const entryStat = await stat(entryPath);
          await removeCacheEntry(entryPath, entryStat);
        }
      }
    }
  }
}
