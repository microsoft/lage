import type { TargetStatus } from "@lage-run/scheduler-types";

export type CompletionStatus = "success" | "failed" | "skipped" | "aborted";

export function isCompletionStatus(status: TargetStatus): status is CompletionStatus {
  return status === "success" || status === "failed" || status === "skipped" || status === "aborted";
}

export function isNonFailureCompletionStatus(status: TargetStatus): status is Exclude<CompletionStatus, "failed"> {
  return status === "success" || status === "skipped" || status === "aborted";
}
