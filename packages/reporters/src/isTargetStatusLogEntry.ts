import type { LogStructuredData } from "@lage-run/logger";
import type { TargetStatusEntry } from "./types/TargetLogEntry.js";

export function isTargetStatusLogEntry(data?: LogStructuredData): data is TargetStatusEntry {
  return data !== undefined && data.target && data.status !== undefined;
}
