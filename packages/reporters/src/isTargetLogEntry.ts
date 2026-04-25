import type { LogEntry, LogStructuredData } from "@lage-run/logger";
import type { TargetData, TargetStatusData } from "./types/TargetLogData.js";
import type { TargetLogEntry } from "./types/TargetReporter.js";

export function isTargetLogEntry(entry: LogEntry<LogStructuredData>): entry is TargetLogEntry {
  return entry.data !== undefined && (entry.data as TargetData).target !== undefined;
}

export function isTargetStatusLogEntry(data?: LogStructuredData): data is TargetStatusData {
  return data !== undefined && (data as TargetStatusData).target && (data as TargetStatusData).status !== undefined;
}
