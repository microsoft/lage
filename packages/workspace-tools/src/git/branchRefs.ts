import { git } from "./git.js";
import type { GitBranchOptions, GitCommonOptions } from "./types.js";

/**
 * Gets the current branch name.
 * In detached HEAD state, returns "HEAD".
 *
 * @returns The branch name if successful, null otherwise
 */
export function getBranchName(options: GitCommonOptions): string | null;
/** @deprecated Use object params version */
export function getBranchName(cwd: string): string | null;
export function getBranchName(cwdOrOptions: string | GitCommonOptions): string | null {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git(["rev-parse", "--abbrev-ref", "HEAD"], {
    description: "Getting current branch name",
    ...options,
  });
  return results.success ? results.stdout : null;
}

/**
 * Gets the full reference path for a given branch.
 * `branch` here is the short branch name, e.g. `branch-name`.
 * @returns The full branch reference (e.g., `refs/heads/branch-name`) if found, null otherwise
 */
export function getFullBranchRef(options: GitBranchOptions): string | null;
/** @deprecated Use object params version */
export function getFullBranchRef(branch: string, cwd: string): string | null;
export function getFullBranchRef(branchOrOptions: string | GitBranchOptions, cwd?: string): string | null {
  const { branch, ...options } =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  const showRefResults = git(["show-ref", "--heads", branch], options);

  return showRefResults.success ? showRefResults.stdout.split(" ")[1] : null;
}

/**
 * Gets the short branch name from a full branch reference.
 * @returns The short branch name if successful, null otherwise
 */
export function getShortBranchName(
  options: {
    /** The full branch reference (e.g., `refs/heads/branch-name`) */
    fullBranchRef: string;
  } & GitCommonOptions
): string | null;
/** @deprecated Use object params version */
export function getShortBranchName(fullBranchRef: string, cwd: string): string | null;
export function getShortBranchName(
  refOrOptions: string | ({ fullBranchRef: string } & GitCommonOptions),
  cwd?: string
): string | null {
  const { fullBranchRef, ...options } =
    typeof refOrOptions === "string" ? { fullBranchRef: refOrOptions, cwd: cwd! } : refOrOptions;

  // The original command `git name-rev --name-only` returned unreliable results if multiple
  // named refs point to the same commit as the branch.
  const showRefResults = git(["rev-parse", "--abbrev-ref", fullBranchRef], options);

  return showRefResults.success ? showRefResults.stdout || null : null;
}

/**
 * Gets the remote tracking branch for the specified branch.
 *
 * @returns The remote branch name (e.g., `origin/main`) if found, null otherwise
 */
export function getRemoteBranch(options: GitBranchOptions): string | null;
/** @deprecated Use object params version */
export function getRemoteBranch(branch: string, cwd: string): string | null;
export function getRemoteBranch(branchOrOptions: string | GitBranchOptions, cwd?: string): string | null {
  const options: GitBranchOptions =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  const results = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${options.branch}@{u}`], options);

  return results.success ? results.stdout.trim() : null;
}
