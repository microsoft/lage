import { git } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Get the content of a file at a specific git ref (commit, branch, tag, etc).
 * Returns undefined if the file doesn't exist at that ref or the command fails.
 */
export function getFileFromRef(
  params: {
    /** cwd-relative path to the file with *forward* slashes */
    filePath: string;
    /** git ref (branch, tag, commit SHA, etc) to get the file content from */
    ref: string;
  } & GitCommonOptions
): string | undefined {
  const { filePath, ref, ...options } = params;
  const result = git(["show", `${ref}:${filePath}`], {
    description: `Getting file ${filePath} at ref ${ref}`,
    ...options,
  });
  return result.success ? result.stdout : undefined;
}
