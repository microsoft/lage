import { getDefaultRemote, type GetDefaultRemoteOptions } from "./getDefaultRemote.js";
import type { getRemotes } from "./getRemotes.js";
import { git } from "./git.js";
import { getDefaultBranch } from "./gitUtilities.js";
import { parseRemoteBranchPlusRemotes, type parseRemoteBranch } from "./parseRemoteBranch.js";
import type { RemoteBranch } from "./types.js";

export type GetDefaultRemoteBranchOptions = GetDefaultRemoteOptions & {
  /**
   * Name of branch to use, **without** a remote prefix. If you want to resolve a branch
   * that may already include a remote prefix, use {@link resolveRemoteAndBranch}.
   *
   * If undefined, uses the default branch name (falling back to `master`).
   */
  branch?: string;
};

// Re-export these so the @link references in jsdoc comments work in the generated .d.ts
export type { getDefaultRemote as _1, getRemotes as _2, parseRemoteBranch as _3, parseRemoteBranchPlusRemotes as _4 };

/**
 * Gets a reference to `options.branch` or the default branch relative to the default remote.
 * (See {@link getDefaultRemote} for how the default remote is determined.)
 * Throws if `options.cwd` is not in a git repo.
 *
 * If you want to resolve a branch that may already include a remote prefix, use
 * {@link resolveRemoteAndBranch} instead.
 *
 * If `options.strict` is true, throws in the same cases as {@link getDefaultRemote}, {@link getRemotes},
 * or if querying the default branch from the remote fails.
 *
 * @returns A branch reference like `upstream/master` or `origin/master`.
 */
export function getDefaultRemoteBranch(options: GetDefaultRemoteBranchOptions): string;
/**
 * First param: `branch`. Second param: `cwd`. See {@link GetDefaultRemoteBranchOptions} for more info.
 * (This had to be changed to `...args` to avoid a conflict with the object param version.)
 * @deprecated Use the object param version
 */
export function getDefaultRemoteBranch(...args: string[]): string;
export function getDefaultRemoteBranch(...args: (string | GetDefaultRemoteBranchOptions)[]): string {
  const [branchOrOptions, argsCwd] = args;
  const options =
    typeof branchOrOptions === "string"
      ? ({ branch: branchOrOptions, cwd: argsCwd } as GetDefaultRemoteBranchOptions)
      : branchOrOptions;

  const result = getDefaultRemoteAndBranch(options);
  return `${result.remote}/${result.remoteBranch}`;
}

/**
 * Like {@link getDefaultRemoteBranch} but it returns an object.
 *
 * @returns A branch reference like `{ remote: "upstream", branch: "master" }` or `{ remote: "origin", branch: "main" }`.
 */
function getDefaultRemoteAndBranch(options: GetDefaultRemoteBranchOptions): RemoteBranch {
  const { cwd, branch } = options;

  const defaultRemote = getDefaultRemote(options);

  if (branch) {
    // For this specific function, `branch` has no remote prefix
    return { remote: defaultRemote, remoteBranch: branch };
  }

  let remoteDefaultBranch: string | undefined;

  // Get the default branch name from the default remote.
  // ls-remote is a plumbing command with stable, locale-independent output.
  // Output format: "ref: refs/heads/main\tHEAD\n<hash>\tHEAD"
  const lsRemoteCmd = ["ls-remote", "--symref", defaultRemote, "HEAD"];
  const lsRemote = git(lsRemoteCmd, {
    cwd,
    throwOnError: options.strict,
    description: `Fetching default branch info from remote "${defaultRemote}"`,
  });
  if (lsRemote.success) {
    const refRegex = /^ref: refs\/heads\/(.*?)\t/;
    const symRefLine = lsRemote.stdout.split("\n").find((line) => refRegex.test(line));
    remoteDefaultBranch = symRefLine && symRefLine.match(refRegex)?.[1];

    if (!remoteDefaultBranch && options.strict) {
      throw new Error(
        `Could not parse default branch from \`git ${lsRemoteCmd.join(" ")}\` output:\n${lsRemote.stdout}`
      );
    }
  }

  // If no default branch found from the remote, fall back to the local git config or "master"
  // (this can't use throwOnError in case the key isn't set)
  remoteDefaultBranch ||= getDefaultBranch({ cwd });

  return { remote: defaultRemote, remoteBranch: remoteDefaultBranch };
}

/**
 * Resolve a user-provided branch (possibly with a remote) to a fully-qualified remote branch.
 * @returns A fully-qualified target remote branch reference (e.g. `origin/main`)
 * @deprecated Use {@link resolveRemoteAndBranch} instead
 */
export function resolveRemoteBranch(
  options: Omit<GetDefaultRemoteBranchOptions, "branch" | "remotes"> & {
    /** Branch which might include a remote prefix */
    branch: string | undefined;
  }
): string {
  const result = resolveRemoteAndBranch(options);
  return `${result.remote}/${result.remoteBranch}`;
}

/**
 * Resolve a user-provided branch (possibly with a remote) to a fully-qualified remote branch.
 * First tries the less-expensive {@link parseRemoteBranchPlusRemotes} (compares with remote names
 * read from `git config`) to see if there's an explicit remote in the branch name, then tries
 * {@link getDefaultRemoteBranch}.
 *
 * If `options.strict` is true, throws in the same cases as {@link parseRemoteBranch},
 * {@link getDefaultRemoteBranch}, {@link getDefaultRemote}, or {@link getRemotes}.
 *
 * @returns A fully-qualified target remote branch reference (e.g. `{ remote: "origin", branch: "main" }`)
 */
export function resolveRemoteAndBranch(
  options: Omit<GetDefaultRemoteBranchOptions, "branch" | "remotes"> & {
    /** Branch which might include a remote prefix */
    branch: string | undefined;
  }
): RemoteBranch {
  const { branch } = options;

  let parsed: ReturnType<typeof parseRemoteBranchPlusRemotes> | undefined;
  if (branch) {
    // A branch is provided, so see if it includes a remote name.
    // The result is saved so the fetched list of remotes can be reused.
    parsed = parseRemoteBranchPlusRemotes({ ...options, branch });
    if (parsed.remote) {
      // have to extract these to avoid returning `remotes`
      return { remote: parsed.remote, remoteBranch: parsed.remoteBranch };
    }
  }

  // No branch provided, or the provided branch didn't include a remote.
  // Get the default remote and possibly default branch.
  return getDefaultRemoteAndBranch({ ...options, remotes: parsed?.remotes });
}
