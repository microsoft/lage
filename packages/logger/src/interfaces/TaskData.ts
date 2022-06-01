export interface TargetData {
  status?: "pending" | "started" | "completed" | "failed" | "skipped";
  package?: string;
  task?: string;
  duration?: string;
  hash?: string | null;
}

/**
 * An alias for the TargetData interface. Provided for backwards compatibility.
 */
export type TaskData = TargetData;