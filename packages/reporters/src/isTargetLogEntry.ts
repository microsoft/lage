import type { LogEntry, LogStructuredData } from "@lage-run/logger";
import type { TargetData, TargetStatusData } from "./types/TargetLogData.js";
import type { TargetLogEntry } from "./types/TargetReporter.js";

export function isTargetLogEntry(entry: LogEntry<LogStructuredData>): entry is TargetLogEntry {
  return entry.data !== undefined && (entry.data as TargetData).target !== undefined;
}

export function isTargetStatusLogEntry(entry: LogEntry<any>): entry is Required<LogEntry<TargetStatusData>> {
  return !!entry.data?.target && entry.data.status !== undefined;
}

export function isTargetStatusData(data: any | undefined): data is TargetStatusData {
  return !!data?.target && data.status !== undefined;
}
