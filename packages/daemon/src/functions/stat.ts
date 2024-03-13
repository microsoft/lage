import { type StatEntry, stat as fastStat } from "glob-hasher";

const stats: Record<string, StatEntry> = {};
export function stat(files: string[]): Record<string, StatEntry> | null {
  // first find files that aren't already in the hashes object
  const filesToProcess = files.filter((file) => !stats[file]);

  if (filesToProcess.length > 0) {
    const newStats = fastStat(filesToProcess);

    if (newStats) {
      for (const file of filesToProcess) {
        if (file in newStats) {
          stats[file] = newStats[file];
        }
      }
    }
  }

  const subset = files.reduce((acc, key) => {
    acc[key] = stats[key];
    return acc;
  }, {} as Record<string, StatEntry>);

  return subset;
}
