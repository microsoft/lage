import { git } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Gets the current commit hash (SHA).
 * @returns The hash if successful, null otherwise
 */
export function getCurrentHash(options: GitCommonOptions): string | null;
/** @deprecated Use object params version */
export function getCurrentHash(cwd: string): string | null;
export function getCurrentHash(cwdOrOptions: string | GitCommonOptions): string | null {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git(["rev-parse", "HEAD"], {
    description: "Getting current git hash",
    ...options,
  });

  return results.success ? results.stdout : null;
}
