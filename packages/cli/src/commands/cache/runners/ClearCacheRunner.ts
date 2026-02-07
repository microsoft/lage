import type { TargetRunner, TargetRunnerOptions } from "@lage-run/runners";
import fs from "fs";
import path from "path";
import { rm, stat, unlink } from "fs/promises";

export class ClearCacheRunner implements TargetRunner {
  public async shouldRun(): Promise<boolean> {
    return true;
  }
  public async run(runOptions: TargetRunnerOptions): Promise<void> {
    const { target } = runOptions;
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

async function removeCacheEntry(entryPath: string, entryStat: fs.Stats) {
  if (entryStat.isDirectory()) {
    return rm(entryPath, { recursive: true });
  } else {
    return unlink(entryPath);
  }
}
