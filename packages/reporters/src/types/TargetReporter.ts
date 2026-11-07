import type { LogEntry, Logger, Reporter } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";
import type { MaybeTargetLogData, TargetLogData } from "./TargetLogData.js";

/**
 * Reporter interface with the proper generic types for lage target logging.
 */
export type TargetReporter = Reporter<TargetLogData, SchedulerRunSummary>;

/**
 * Log entry for `TargetLogger`/`TargetReporter`.
 * If `data` is defined, it's usually for a target, but occasionally for something else.
 */
export type MaybeTargetLogEntry = LogEntry<MaybeTargetLogData>;

export type TargetLogEntry = LogEntry<TargetLogData> & Required<Pick<LogEntry<TargetLogData>, "data">>;

/**
 * Logger with the proper generic types for lage target logging.
 */
export type TargetLogger = Logger<TargetLogData, SchedulerRunSummary>;
