import type { LogStructuredData } from "@lage-run/logger";
import type { TargetStatusData } from "./types/TargetLogData.js";

export function isTargetStatusLogEntry(data?: LogStructuredData): data is TargetStatusData {
  return data !== undefined && data.target && data.status !== undefined;
}
