import { git, processGitOutput } from "./git.js";
import type { GetChangesBetweenRefsOptions, GitBranchOptions, GitCommonOptions } from "./types.js";

const diffArgs = ["--no-pager", "diff", "--name-only", "--relative"] as const;

/**
 * Gets file paths with changes between two git references (commits, branches, tags).
 * Throws an error on failure by default.
 *
 * @returns An array of file paths that have changed
 */
export function getChangesBetweenRefs(options: GetChangesBetweenRefsOptions): string[];
/** @deprecated Use object param version */
export function getChangesBetweenRefs(
  fromRef: string,
  toRef: string,
  options: string[],
  pattern: string,
  cwd: string
): string[];
export function getChangesBetweenRefs(
  fromRef: string | GetChangesBetweenRefsOptions,
  toRef?: string,
  options?: string[],
  pattern?: string,
  cwd?: string
): string[] {
  let gitOptions: GitCommonOptions;
  if (typeof fromRef === "string") {
    gitOptions = { cwd: cwd! };
  } else {
    ({ fromRef, toRef, options, pattern, ...gitOptions } = fromRef);
  }

  const range = `${fromRef}...${toRef || ""}`;
  const results = git([...diffArgs, ...(options || []), range, ...(pattern ? ["--", pattern] : [])], {
    description: `Gathering information about changes between refs (${range})`,
    throwOnError: true,
    ...gitOptions,
  });
  return processGitOutput(results, { excludeNodeModules: true });
}

/**
 * Gets file paths with changes between the current branch and the given branch.
 * Throws an error on failure.
 *
 * @returns An array of relative file paths that have changed
 * @deprecated Use `getBranchChanges({ branch, cwd })`
 */
export function getChanges(branch: string, cwd: string): string[] {
  return getChangesBetweenRefs({ fromRef: branch, cwd, throwOnError: true });
}

/**
 * Gets file paths with changes between the branch and the merge-base.
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths that have changed
 */
export function getBranchChanges(options: GitBranchOptions): string[];
/** @deprecated Use object params version */
export function getBranchChanges(branch: string, cwd: string): string[];
export function getBranchChanges(branchOrOptions: string | GitBranchOptions, cwd?: string): string[] {
  const { branch, ...options } =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  return getChangesBetweenRefs({ fromRef: branch, throwOnError: true, ...options });
}

/**
 * Get a list of files with untracked changes.
 * Throws an error on failure by default.
 *
 * @returns An array of file paths with untracked changes
 */
export function getUntrackedChanges(options: GitCommonOptions): string[];
/** @deprecated Use object params version */
export function getUntrackedChanges(cwd: string): string[];
export function getUntrackedChanges(cwdOrOptions: string | GitCommonOptions): string[] {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git(["ls-files", "--others", "--exclude-standard"], {
    description: "Gathering information about untracked changes",
    throwOnError: true,
    ...options,
  });
  return processGitOutput(results, { excludeNodeModules: true });
}

/**
 * Gets file paths with changes that have not been staged yet.
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths with unstaged changes
 */
export function getUnstagedChanges(options: GitCommonOptions): string[];
/** @deprecated Use object params version */
export function getUnstagedChanges(cwd: string): string[];
export function getUnstagedChanges(cwdOrOptions: string | GitCommonOptions): string[] {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git([...diffArgs], {
    description: "Gathering information about unstaged changes",
    throwOnError: true,
    ...options,
  });
  return processGitOutput(results, { excludeNodeModules: true });
}

/**
 * Gets all files with staged changes (files added to the index).
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths that have been staged
 */
export function getStagedChanges(options: GitCommonOptions): string[];
/** @deprecated Use object params version */
export function getStagedChanges(cwd: string): string[];
export function getStagedChanges(cwdOrOptions: string | GitCommonOptions): string[] {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git([...diffArgs, "--staged"], {
    description: "Gathering information about staged changes",
    throwOnError: true,
    ...options,
  });
  return processGitOutput(results, { excludeNodeModules: true });
}
