import { git, processGitOutput } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Lists all tracked files matching the given patterns.
 * Throws on error by default.
 * @returns An array of file paths, or an empty array if no files are found
 */
export function listAllTrackedFiles(
  options: {
    /** File patterns to match (passed to git ls-files) */
    patterns: string[];
  } & GitCommonOptions
): string[];
/** @deprecated Use object params version */
export function listAllTrackedFiles(patterns: string[], cwd: string): string[];
export function listAllTrackedFiles(
  patternsOrOptions: string[] | ({ patterns: string[] } & GitCommonOptions),
  cwd?: string
): string[] {
  const { patterns, ...options } = Array.isArray(patternsOrOptions)
    ? { patterns: patternsOrOptions, cwd: cwd! }
    : patternsOrOptions;

  const results = git(["ls-files", ...patterns], { throwOnError: true, ...options });

  return processGitOutput(results);
}
