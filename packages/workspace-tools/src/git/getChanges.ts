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
 * Gets staged, unstaged, and untracked file paths in one git status call.
 * Paths are relative to the repository root, and node_modules paths are excluded.
 * Renames report the destination path. Throws an error on failure by default.
 */
export function getWorkingTreeChanges(options: GitCommonOptions): string[] {
  const results = git(["status", "--porcelain=v1", "-z", "--untracked-files=all"], {
    description: "Gathering information about working tree changes",
    throwOnError: true,
    ...options,
  });
  if (!results.success) {
    return [];
  }

  const entries = results.stdout.split("\0");
  const changedFiles: string[] = [];
  for (let entryIndex = 0; entryIndex < entries.length; entryIndex++) {
    const entry = entries[entryIndex];
    const file = entry.slice(3);
    if (file && !file.includes("node_modules")) {
      changedFiles.push(file);
    }
    if (entry[0] === "R" || entry[0] === "C" || entry[1] === "R" || entry[1] === "C") {
      entryIndex++;
    }
  }

  return changedFiles;
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
 * (To get all local uncommitted changes, use `getWorkingTreeChanges`.)
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
 * (To get all local uncommitted changes, use `getWorkingTreeChanges`.)
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
 * (To get all local uncommitted changes, use `getWorkingTreeChanges`.)
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
