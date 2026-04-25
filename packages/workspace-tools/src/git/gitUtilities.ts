//
// Assorted other git utilities
// (could be split into separate files later if desired)
//

import { getConfigValue } from "./config.js";
import { git, processGitOutput } from "./git.js";
import type {
  GetChangesBetweenRefsOptions,
  GitBranchOptions,
  GitCommitOptions,
  GitCommonOptions,
  GitFetchOptions,
  GitInitOptions,
  GitStageOptions,
  ParsedRemoteBranch,
  ParseRemoteBranchOptions,
} from "./types.js";

const diffArgs = ["--no-pager", "diff", "--name-only", "--relative"];

/**
 * Get a list of files with untracked changes.
 * Throws an error on failure by default.
 *
 * @returns An array of file paths with untracked changes
 */
// TODO: move to getChanges.ts
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
 * Fetch from the given remote (and optionally branch) or all remotes.
 * Throws an error on failure by default.
 */
// TODO: move to fetch.ts
export function fetchRemote(options: GitFetchOptions): void;
/** @deprecated Use object params version */
export function fetchRemote(remote: string, cwd: string): void;
export function fetchRemote(remoteOrOptions: string | GitFetchOptions, cwd?: string): void {
  const { remote, remoteBranch, options, ...gitOptions } =
    typeof remoteOrOptions === "string"
      ? ({ remote: remoteOrOptions, cwd: cwd! } satisfies GitFetchOptions)
      : remoteOrOptions;

  if (remoteBranch && !remote) {
    throw new Error('Must provide "remote" when using "remoteBranch" option');
  }

  const fetchArgs = [
    "fetch",
    "--",
    ...(remote ? [remote] : []),
    ...(remoteBranch ? [remoteBranch] : []),
    ...(options || []),
  ];

  git(fetchArgs, {
    description: remote
      ? `Fetching ${remoteBranch ? `branch "${remoteBranch}" from ` : ""}remote "${remote}"`
      : "Fetching all remotes",
    throwOnError: true,
    ...gitOptions,
  });
}

/**
 * Fetch from the given remote and branch. Throws an error on failure.
 * @deprecated Use `fetchRemote({ remote, remoteBranch, cwd })`
 */
// TODO: move to fetch.ts
export function fetchRemoteBranch(remote: string, remoteBranch: string, cwd: string): void {
  fetchRemote({ remote, remoteBranch, cwd, throwOnError: true });
}

/**
 * Gets file paths with changes that have not been staged yet.
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths with unstaged changes
 */
// TODO: move to getChanges.ts
export function getUnstagedChanges(options: GitCommonOptions): string[];
/** @deprecated Use object params version */
export function getUnstagedChanges(cwd: string): string[];
export function getUnstagedChanges(cwdOrOptions: string | GitCommonOptions): string[] {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const results = git(diffArgs, {
    description: "Gathering information about unstaged changes",
    throwOnError: true,
    ...options,
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
// TODO: move to getChanges.ts
export function getChanges(branch: string, cwd: string): string[] {
  return getChangesBetweenRefs({ fromRef: branch, cwd, throwOnError: true });
}

/**
 * Gets file paths with changes between the branch and the merge-base.
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths that have changed
 */
// TODO: move to getChanges.ts
export function getBranchChanges(options: GitBranchOptions): string[];
/** @deprecated Use object params version */
export function getBranchChanges(branch: string, cwd: string): string[];
export function getBranchChanges(branchOrOptions: string | GitBranchOptions, cwd?: string): string[] {
  const { branch, ...options } =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  return getChangesBetweenRefs({ fromRef: branch, throwOnError: true, ...options });
}

/**
 * Gets file paths with changes between two git references (commits, branches, tags).
 * Throws an error on failure by default.
 *
 * @returns An array of file paths that have changed
 */
// TODO: move to getChanges.ts
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
 * Gets all files with staged changes (files added to the index).
 * Throws an error on failure by default.
 *
 * @returns An array of relative file paths that have been staged
 */
// TODO: move to getChanges.ts
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

/**
 * Gets recent commit messages between the specified parent branch and HEAD.
 * By default, returns an empty array if the operation fails.
 *
 * @returns An array of commit message strings
 */
// TODO: move to history.ts
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

/**
 * Gets the user email from the git config.
 * @returns The email string if found, null otherwise
 */
// TODO: move to config.ts
export function getUserEmail(options: GitCommonOptions): string | null;
/** @deprecated Use object params version */
export function getUserEmail(cwd: string): string | null;
export function getUserEmail(cwdOrOptions: string | GitCommonOptions): string | null {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  return getConfigValue({ key: "user.email", ...options });
}

/**
 * Gets the current branch name.
 * In detached HEAD state, returns "HEAD".
 *
 * @returns The branch name if successful, null otherwise
 */
// TODO: move to refs.ts
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
// TODO: move to refs.ts
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
// TODO: move to refs.ts
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
 * Gets the current commit hash (SHA).
 * @returns The hash if successful, null otherwise
 */
// TODO: move to refs.ts
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

/**
 * Get the commit hash in which the file was first added.
 * @returns The commit hash if found, undefined otherwise
 */
// TODO: move to history.ts
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

/**
 * Run `git init` and verify that the `user.name` and `user.email` configs are set (at any level).
 * Throws an error if `git init` fails.
 *
 * If `user.email` and `user.name` aren't already set globally, and the missing value is provided
 * in params, set it at the repo level. Otherwise, throw an error.
 */
// TODO: move to init.ts
export function init(options: GitInitOptions): void;
/** @deprecated Use object params version */
export function init(cwd: string, email?: string, username?: string): void;
export function init(cwdOrOptions: string | GitInitOptions, _email?: string, _username?: string): void {
  const { email, username, ...options } =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions, email: _email, username: _username } : cwdOrOptions;

  git(["init"], { ...options, throwOnError: true });

  if (!getConfigValue({ key: "user.name", ...options })) {
    if (!username) {
      throw new Error("must include a username when initializing git repo");
    }
    git(["config", "user.name", username], options);
  }

  if (!getUserEmail(options)) {
    if (!email) {
      throw new Error("must include a email when initializing git repo");
    }
    git(["config", "user.email", email], options);
  }
}

/**
 * Stages files matching the given patterns.
 */
// TODO: move to stageAndCommit.ts
export function stage(options: GitStageOptions): void;
/** @deprecated Use object params version */
export function stage(patterns: string[], cwd: string): void;
export function stage(patternsOrOptions: string[] | GitStageOptions, cwd?: string): void {
  const { patterns, ...options } = Array.isArray(patternsOrOptions)
    ? { patterns: patternsOrOptions, cwd: cwd! }
    : patternsOrOptions;

  for (const pattern of patterns) {
    git(["add", pattern], { ...options, description: `Staging changes (git add ${pattern})` });
  }
}

/**
 * Commit changes. Throws an error on failure by default.
 */
// TODO: move to stageAndCommit.ts
export function commit(options: GitCommitOptions): void;
/** @deprecated Use object params version */
export function commit(message: string, cwd: string, options?: string[]): void;
export function commit(messageOrOptions: string | GitCommitOptions, _cwd?: string, _options?: string[]): void {
  const { message, options, ...gitOptions } =
    typeof messageOrOptions === "string"
      ? { message: messageOrOptions, cwd: _cwd!, options: _options }
      : messageOrOptions;

  git(["commit", "-m", message, ...(options || [])], {
    throwOnError: true,
    description: "Committing changes",
    ...gitOptions,
  });
}

/**
 * Stages files matching the given patterns and creates a commit with the specified message.
 * Convenience function that combines `stage()` and `commit()`.
 * Throws an error on commit failure by default.
 */
// TODO: move to stageAndCommit.ts
export function stageAndCommit(options: GitStageOptions & GitCommitOptions): void;
/** @deprecated Use object params version */
export function stageAndCommit(patterns: string[], message: string, cwd: string, commitOptions?: string[]): void;
export function stageAndCommit(
  patternsOrOptions: string[] | (GitStageOptions & GitCommitOptions),
  message?: string,
  cwd?: string,
  commitOptions?: string[]
): void {
  const options: GitStageOptions & GitCommitOptions = Array.isArray(patternsOrOptions)
    ? { patterns: patternsOrOptions, message: message!, cwd: cwd!, options: commitOptions }
    : patternsOrOptions;

  stage(options);
  commit(options);
}

/**
 * Reverts all local changes (both staged and unstaged) by stashing them and then dropping the stash.
 * @returns True if the revert was successful, false otherwise. It will also be false if there were
 * no changes to revert. (To distinguish between this case and errors, use the `throwOnError` option.)
 */
// TODO: move to revertLocalChanges.ts
export function revertLocalChanges(options: GitCommonOptions): boolean;
/** @deprecated Use object params version */
export function revertLocalChanges(cwd: string): boolean;
export function revertLocalChanges(cwdOrOptions: string | GitCommonOptions): boolean {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const stash = `workspace-tools_${new Date().getTime()}`;
  if (!git(["stash", "push", "-u", "-m", stash], options).success) {
    return false;
  }

  const results = git(["stash", "list"], options);
  if (results.success) {
    const matched = results.stdout
      .split(/\n/)
      .find((line) => line.includes(stash))
      ?.match(/^[^:]+/);

    if (matched) {
      git(["stash", "drop", matched[0]], options);
      return true;
    }
  }

  return false;
}

/**
 * Attempts to determine the parent branch of the current branch using `git show-branch`.
 * @returns The parent branch name if found, null otherwise
 * @deprecated Does not appear to be used
 */
export function getParentBranch(cwd: string): string | null {
  const branchName = getBranchName({ cwd });

  if (!branchName || branchName === "HEAD") {
    return null;
  }

  const showBranchResult = git(["show-branch", "-a"], { cwd });

  if (showBranchResult.success) {
    const showBranchLines = showBranchResult.stdout.split(/\n/);
    const parentLine = showBranchLines.find(
      (line) => line.includes("*") && !line.includes(branchName) && !line.includes("publish_")
    );

    const matched = parentLine?.match(/\[(.*)\]/);
    return matched ? matched[1] : null;
  }

  return null;
}

/**
 * Gets the remote tracking branch for the specified branch.
 *
 * @returns The remote branch name (e.g., `origin/main`) if found, null otherwise
 */
// TODO: move to refs.ts
export function getRemoteBranch(options: GitBranchOptions): string | null;
/** @deprecated Use object params version */
export function getRemoteBranch(branch: string, cwd: string): string | null;
export function getRemoteBranch(branchOrOptions: string | GitBranchOptions, cwd?: string): string | null {
  const options: GitBranchOptions =
    typeof branchOrOptions === "string" ? { branch: branchOrOptions, cwd: cwd! } : branchOrOptions;

  const results = git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${options.branch}@{u}`], options);

  return results.success ? results.stdout.trim() : null;
}

/**
 * Get the remote and branch name from a full branch name that may include a remote prefix.
 * If the path doesn't start with one of `options.knownRemotes` (but has multiple segments),
 * the actual list of remotes will be fetched to see if one of those matches.
 *
 * NOTE: The additional verification is new in the object params version; the original version
 * incorrectly assumes the first segment before a slash is always a remote.
 */
// TODO: move to parseRemoteBranch.ts
export function parseRemoteBranch(options: ParseRemoteBranchOptions): ParsedRemoteBranch;
/**
 * @deprecated Use object params version, which does more verification. This version inaccurately
 * assumes the first segment before a slash is always a remote, which could lead to tricky bugs.
 */
export function parseRemoteBranch(branch: string): ParsedRemoteBranch;
export function parseRemoteBranch(branchOrOptions: string | ParseRemoteBranchOptions): ParsedRemoteBranch {
  if (typeof branchOrOptions === "string") {
    const branch = branchOrOptions;
    const firstSlashPos = branch.indexOf("/", 0);
    return {
      remote: branch.substring(0, firstSlashPos),
      remoteBranch: branch.substring(firstSlashPos + 1),
    };
  }

  const { branch, knownRemotes = ["origin", "upstream"], ...options } = branchOrOptions;

  if (!branch.includes("/")) {
    return { remote: "", remoteBranch: branch };
  }

  let remote = knownRemotes.find((r) => branch.startsWith(`${r}/`));

  if (!remote) {
    const remotes = git(["remote"], options).stdout.trim().split(/\n/);
    remote = remotes.find((r) => branch.startsWith(`${r}/`));
  }

  if (remote) {
    return { remote, remoteBranch: branch.slice(remote.length + 1) };
  }
  return { remote: "", remoteBranch: branch };
}

/**
 * Gets the default branch based on `git config init.defaultBranch`, falling back to `master`.
 */
// TODO: move to config.ts
export function getDefaultBranch(options: GitCommonOptions): string;
/** @deprecated Use object params version */
export function getDefaultBranch(cwd: string): string;
export function getDefaultBranch(cwdOrOptions: string | GitCommonOptions): string {
  const options = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  // Default to the legacy 'master' for backwards compat and old git clients
  return getConfigValue({ key: "init.defaultBranch", ...options }) || "master";
}

/**
 * Lists all tracked files matching the given patterns.
 * Throws on error by default.
 * @returns An array of file paths, or an empty array if no files are found
 */
// TODO: move to history.ts
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
