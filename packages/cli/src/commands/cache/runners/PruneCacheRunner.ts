import type { TargetRunner, TargetRunnerOptions } from "@lage-run/runners";
import fs from "fs";
import path from "path";
import { rm, stat, unlink } from "fs/promises";

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export class PruneCacheRunner implements TargetRunner {
  async shouldRun(): Promise<boolean> {
    return true;
  }
  async run(runOptions: TargetRunnerOptions): Promise<void> {
    const { target } = runOptions;
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

async function removeCacheEntry(entryPath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    return rm(entryPath, { recursive: true });
  } else {
    return unlink(entryPath);
  }
}
