import type { LogStructuredData, LogEntry } from "@lage-run/logger";
import type { TargetStatusData } from "@lage-run/reporters";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { getTargetId } from "@lage-run/target-graph";

export type ParsedLogEntry = Omit<LogEntry<LogStructuredData>, "timestamp">;

/**
 * Parse `JsonReporter` output and remove timestamps and any lines that don't follow the expected format.
 *
 * Usually each entry's data is `JsonReporterLogData`, unless something (such as the `info` command)
 * logged some custom data.
 *
 * @param ndjson - One or more output strings. This way you can pass both stdout and stderr.
 */
export function parseNdJson(...ndjson: string[]): ParsedLogEntry[] {
  return ndjson
    .join("\n")
    .split("\n")
    .map((line) => {
      try {
        const parsed = JSON.parse(line);
        if (!(parsed as LogEntry<LogStructuredData>).level) {
          return {};
        }
        delete (parsed as Partial<LogEntry<LogStructuredData>>).timestamp;
        return parsed;
      } catch {
        return {};
      }
    })
    .filter((entry) => Object.keys(entry).length > 0);
}

/**
 * Builds an index of first-occurrence positions for each (package, task) pair with the given status.
 * Keys are in `"packageName#task"` format (matching `getTargetId`).
 * Entries not found are omitted from the result.
 */
export function getStatusIndices(params: {
  entries: ParsedLogEntry[];
  packages: string[];
  tasks: string[];
  status: TargetStatus;
}): Record<string, number> {
  const { entries, packages, tasks, status } = params;
  const statusEntries = getStatusEntriesData(entries);
  const indices: Record<string, number> = {};

  for (const pkg of packages) {
    for (const task of tasks) {
      const index = statusEntries.findIndex((e) => e.target.packageName === pkg && e.target.task === task && e.status === status);
      if (index > -1) {
        indices[getTargetId(pkg, task)] = index;
      }
    }
  }

  return indices;
}

type PartialTargetStatusData = Pick<TargetStatusData, "status"> & {
  target: Pick<TargetStatusData["target"], "packageName" | "task">;
};

/**
 * Extracts target status entries with minimal information from the log entries.
 */
export function getStatusEntriesData(entries: ParsedLogEntry[]): PartialTargetStatusData[] {
  return entries
    .filter((entry): entry is LogEntry<TargetStatusData> => !!entry.data && "status" in entry.data && "target" in entry.data)
    .map((entry) => ({
      status: entry.data!.status,
      target: { packageName: entry.data!.target.packageName, task: entry.data!.target.task },
    }));
}
