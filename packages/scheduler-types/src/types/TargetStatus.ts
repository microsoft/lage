/**
 * - `pending` - The target is waiting to be scheduled (initial state).
 * - `queued` - The target is queued and waiting for a worker to become available.
 * - `running` - The target is currently being executed.
 * - `success` - The target has completed successfully.
 * - `failed` - The target has failed.
 * - `skipped` - The target was skipped (used results from cache).
 * - `aborted` - The target was aborted.
 */
export type TargetStatus = "pending" | "queued" | "running" | "success" | "failed" | "skipped" | "aborted";
