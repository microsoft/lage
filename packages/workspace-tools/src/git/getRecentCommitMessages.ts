import { git, processGitOutput } from "./git.js";
import type { GitBranchOptions } from "./types.js";

/**
 * Gets recent commit messages between the specified parent branch and HEAD.
 * By default, returns an empty array if the operation fails.
 *
 * @returns An array of commit message strings
 */
export function getRecentCommitMessages(options: GitBranchOptions): string[];
/** @deprecated Use object params version */
export function getRecentCommitMessages(branch: string, cwd: string): string[];
export function getRecentCommitMessages(branchOrOptions: string | GitBranchOptions, cwd?: string): string[] {
  const { branch, ...options } =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  const results = git(["log", "--decorate", "--pretty=format:%s", `${branch}..HEAD`], {
    description: `Getting recent commit messages for branch "${branch}"`,
    ...options,
  });
  return processGitOutput(results);
}
