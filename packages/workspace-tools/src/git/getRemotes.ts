import { git, GitError, type GitProcessOutput } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Get a mapping from remote names to fetch URLs.
 *
 * Note this returns the URLs directly from `git config --local --get-regexp 'remote\..*\.url'`,
 * which doesn't respect any `url.<base>.insteadOf` remappings (such as for ssh). This should be
 * fine for current usage: `parseRemoteBranch` only needs the names, and `getDefaultRemote`
 * compares parsed URLs from `package.json` `repository` and should be flexible about formats.
 *
 * If `options.throwOnError` is true, throws if no remotes are found or `cwd` isn't in a git repo.
 *
 * @returns An object mapping remote names to URLs.
 */
export function getRemotes(options: GitCommonOptions): Record<string, string> {
  let remotesResult: GitProcessOutput;
  try {
    // Get remote names and URLs, similar to `git remote -v` but without localization concerns.
    // --local ensures it errors if cwd is not in a git repo.
    remotesResult = git(["config", "--local", "--get-regexp", "remote\\..*\\.url"], {
      ...options,
      description: "Getting git remotes",
    });
  } catch (e) {
    if (e instanceof GitError) {
      if (e.gitOutput?.status === 1) {
        // Per git config docs, 1 means the key wasn't found, so fail with a clearer message
        // (this case will only be hit with throwOnError: true)
        throw new GitError(`No remotes defined in git repo at ${options.cwd}`, undefined, e.gitOutput);
      }
      if (e.gitOutput?.status === 128) {
        // 128 most commonly means not a git repository
        throw new GitError(`${options.cwd} is not in a git repository`, undefined, e.gitOutput);
      }
    }
    throw e;
  }

  if (!remotesResult.success) {
    // throwOnError was false/unset but no remotes were found
    return {};
  }

  const remotes: Record<string, string> = {};
  const remoteLines = remotesResult.stdout.trim().split("\n");
  for (const line of remoteLines) {
    const remoteMatch = line.match(/^remote\.(.+?)\.url\s+(.*)$/);
    if (!remoteMatch) continue;
    const [, remoteName, remoteUrl] = remoteMatch;
    remotes[remoteName] = remoteUrl;
  }

  return remotes;
}
