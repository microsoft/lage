/**
 * Detect if we're running in a CI environment:
 * - `process.env.TF_BUILD` for ADO
 * - `process.env.CI` for most others
 * - not running in a test (`process.env.NODE_ENV` is `test` or `process.env.JEST_WORKER_ID` is set)
 */
export const isRunningFromCI: boolean =
  process.env.NODE_ENV !== "test" && !process.env.JEST_WORKER_ID && (!!process.env.CI || !!process.env.TF_BUILD);
