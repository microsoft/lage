export interface TaskData {
  status?: "pending" | "started" | "completed" | "failed" | "skipped";
  package?: string;
  task?: string;
  duration?: string;
  hash?: string | null;
}
