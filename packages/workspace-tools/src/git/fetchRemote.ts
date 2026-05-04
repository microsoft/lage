import { git } from "./git.js";
import type { GitFetchOptions } from "./types.js";

/**
 * Fetch from the given remote (and optionally branch) or all remotes.
 * Throws an error on failure by default.
 */
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
export function fetchRemoteBranch(remote: string, remoteBranch: string, cwd: string): void {
  fetchRemote({ remote, remoteBranch, cwd, throwOnError: true });
}
