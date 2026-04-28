import { git } from "./git.js";
import type { ParsedRemoteBranch, ParseRemoteBranchOptions } from "./types.js";

/**
 * Get the remote and branch name from a full branch name that may include a remote prefix.
 * If the path doesn't start with one of `options.knownRemotes` (but has multiple segments),
 * the actual list of remotes will be fetched to see if one of those matches.
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
