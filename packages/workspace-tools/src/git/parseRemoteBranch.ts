import { getRemotes } from "./getRemotes.js";
import type { ParsedRemoteBranch, ParseRemoteBranchOptions } from "./types.js";

/**
 * Get the remote and branch name from a full branch name that may include a remote prefix.
 * If the path doesn't start with one of `options.knownRemotes` (but has multiple segments),
 * the actual list of remotes will be read via `git config` to see if one of those matches.
 *
 * With `throwOnError: true`, currently it will NOT throw if the branch prefix matches `knownRemotes`
 * regardless of the actual state of remotes in the repo. If it has to get the actual list of
 * remotes, it will throw in the same cases as {@link getRemotes}.
 *
 * NOTE: The additional verification is new in the object params version; the original version
 * incorrectly assumes the first segment before a slash is always a remote.
 */
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

  // Remove the list of remotes from the result
  const { remote, remoteBranch } = parseRemoteBranchPlusRemotes(branchOrOptions);
  return { remote, remoteBranch };
}

/**
 * See {@link parseRemoteBranch}. This version also returns the remotes in the result if they were
 * read from git, for reuse by other operations.
 */
export function parseRemoteBranchPlusRemotes(
  options: ParseRemoteBranchOptions
): ParsedRemoteBranch & { remotes: Record<string, string> | undefined } {
  const { branch, knownRemotes = ["origin", "upstream"], ...otherOptions } = options;

  if (!branch.includes("/")) {
    return { remote: "", remoteBranch: branch, remotes: undefined };
  }

  // As a shortcut, check for the most common remote names before doing git operations
  let remote = knownRemotes.find((r) => branch.startsWith(`${r}/`));

  let remotes: Record<string, string> | undefined;
  if (!remote) {
    // There's a slash in the branch name, but it doesn't start with one of the common remote names.
    // Get the real list of remotes from git to see if it matches any of those, or is just a branch
    // with a slash in the name (e.g. "feature/foo/bar"). This just reads the git config and isn't
    // an expensive operation, but save the returned remotes for later anyway.
    remotes = getRemotes(otherOptions);
    if (remotes) {
      remote = Object.keys(remotes).find((r) => branch.startsWith(`${r}/`));
    }
  }

  if (remote) {
    return { remote, remoteBranch: branch.slice(remote.length + 1), remotes };
  }
  return { remote: "", remoteBranch: branch, remotes };
}
