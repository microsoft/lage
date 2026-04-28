import { git } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Get the commit hash in which the file was first added.
 * @returns The commit hash if found, undefined otherwise
 */
export function getFileAddedHash(options: { filename: string } & GitCommonOptions): string | undefined;
/** @deprecated Use object params version */
export function getFileAddedHash(filename: string, cwd: string): string | undefined;
export function getFileAddedHash(
  filenameOrOptions: string | ({ filename: string } & GitCommonOptions),
  cwd?: string
): string | undefined {
  const { filename, ...options } =
    typeof filenameOrOptions === "string" ? { filename: filenameOrOptions, cwd: cwd! } : filenameOrOptions;

  const results = git(["rev-list", "--max-count=1", "HEAD", filename], options);

  return results.success ? results.stdout.trim() : undefined;
}
