/**
 * Helper that logs an error to `console.warn` if `process.env.VERBOSE` is set.
 * This should be replaced with a proper logging system eventually.
 */
export function logVerboseWarning(description: string, err?: unknown): void {
  if (process.env.VERBOSE) {
    console.warn(`${description}${err ? ":\n" : ""}`, (err as Error | undefined)?.stack || err || "");
  }
}
