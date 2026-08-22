import { git } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Gets the merge-base (common ancestor) commit SHA between two git refs.
 *
 * This corresponds to the point that `getBranchChanges` / `git diff <ref>...` compares against, so
 * it can be used to read the "old" version of a file consistently with the set of changed files.
 *
 * Returns undefined if no merge-base exists or the command fails.
 */
export function getMergeBase(
  params: {
    /** The first ref (e.g. the `--since` target branch). */
    ref: string;
    /** The second ref (defaults to `HEAD`). */
    otherRef?: string;
  } & GitCommonOptions
): string | undefined {
  const { ref, otherRef = "HEAD", ...options } = params;
  const result = git(["merge-base", ref, otherRef], {
    description: `Getting merge-base of ${ref} and ${otherRef}`,
    ...options,
  });
  return result.success ? result.stdout.trim() : undefined;
}
