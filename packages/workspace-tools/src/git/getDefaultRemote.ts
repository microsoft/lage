import fs from "fs";
import path from "path";
import { findGitRoot } from "../paths.js";
import { type PackageInfo } from "../types/PackageInfo.js";
import { getRepositoryName } from "./getRepositoryName.js";
import { getRemotes } from "./getRemotes.js";

export type GetDefaultRemoteOptions = {
  /** Get repository info relative to this directory. */
  cwd: string;
  /**
   * If true, throw an error if remote info can't be found, if no `package.json` is found, or if
   * a `repository` is specified in package.json but no matching remote exists.
   */
  strict?: boolean;
  /** If true, log debug messages about how the remote was chosen */
  verbose?: boolean;
  /** Optional pre-fetched mapping from remote name to remote URL */
  remotes?: Record<string, string>;
};

/**
 * Get the name of the default remote: the one matching the `repository` field in package.json.
 * Throws if `options.cwd` is not in a git repo.
 *
 * It's recommended to set `strict: true` to also throw if no remotes are defined, no package.json
 * is found, or package.json has a `repository` field but no matching remote exists.
 *
 * The order of preference for returned remotes is:
 * 1. If `repository` is defined in package.json, the remote with a matching URL (if `options.strict`
 *    is true, throws an error if no matching remote exists)
 * 2. `upstream` if defined
 * 3. `origin` if defined
 * 4. The first defined remote
 * 5. If there are no defined remotes: throws an error if `options.strict` is true; otherwise returns `origin`
 *
 * @returns The name of the inferred default remote.
 */
export function getDefaultRemote(options: GetDefaultRemoteOptions): string;
/** @deprecated Use the object param version */
export function getDefaultRemote(cwd: string): string;
export function getDefaultRemote(cwdOrOptions: string | GetDefaultRemoteOptions): string {
  const options = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  const { cwd, strict, verbose } = options;

  const log = (message: string) => verbose && console.log(message);
  const logOrThrow = (message: string) => {
    if (strict) {
      throw new Error(message);
    }
    log(message);
  };

  // Get remote names and URLs via `git config`.
  // In strict mode, it will throw if cwd isn't in a git repo or no remotes are found.
  const remotes = options.remotes || getRemotes({ cwd, throwOnError: strict });
  if (!Object.keys(remotes).length) {
    // For non-strict, verify cwd is actually in a git repo (throws if not)
    !strict && findGitRoot(cwd);

    // It's a git repo with no remotes configured. This should probably always be an error (since
    // subsequent operations which require a remote likely won't work), but to match old behavior,
    // still default to "origin" unless `strict` is true.
    logOrThrow(`No remotes defined in git repo at ${cwd}`);
    log(`Assuming default remote "origin"`);
    return "origin";
  }

  // Try to find the repository URL:
  // Try package.json from `cwd` first, since cwd is often the project root in actual usage,
  // and the repository URL should be the same throughout the repo.
  const cwdPackageJsonPath = path.join(cwd, "package.json");
  const hasCwdPackageJson = fs.existsSync(cwdPackageJsonPath);

  let repositoryUrl: string | undefined;
  if (hasCwdPackageJson) {
    // Only try to read this if it exists (will fall back to git root later)
    repositoryUrl = getRepositoryUrlFromPackageJson(cwdPackageJsonPath, logOrThrow);
  }

  let rootPackageJsonPath: string | undefined;
  if (!repositoryUrl) {
    // If cwd doesn't have package.json or it doesn't specify a repository, try the git root
    const gitRoot = findGitRoot(cwd);
    rootPackageJsonPath = path.join(gitRoot, "package.json");
    if (!hasCwdPackageJson && !fs.existsSync(rootPackageJsonPath)) {
      // no package.json found
      const paths = cwd === gitRoot ? `${cwd}` : `${cwd} or git root ${gitRoot}`;
      logOrThrow(`Could not find package.json under ${paths}`);
    } else if (gitRoot !== cwd) {
      repositoryUrl = getRepositoryUrlFromPackageJson(rootPackageJsonPath, logOrThrow);
    }
  }

  if (!repositoryUrl) {
    // This is always logged because it's strongly recommended to fix.
    // Recommend putting it in package.json at cwd if it exists.
    // (if there is no {cwd}/package.json, rootPackageJsonPath is always defined)
    const jsonPath = hasCwdPackageJson ? cwdPackageJsonPath : rootPackageJsonPath!;
    console.log(
      `Valid "repository" key not found in package.json at ${jsonPath}. ` +
        `Consider adding this info for more accurate git remote detection.`
    );
  }

  // If a repository URL is found, try to match it with a remote
  const remoteName = repositoryUrl && _matchRepositoryUrlToRemote(repositoryUrl, remotes, logOrThrow);
  if (remoteName) {
    return remoteName;
  }

  // Default to upstream or origin if available, or the first remote otherwise
  const fallback = ["upstream", "origin"].find((name) => !!remotes[name]) || Object.keys(remotes)[0];
  log(`Default to remote "${fallback}"`);
  return fallback;
}

/** Match repository URL from package.json to a git remote. Exported for testing. */
export function _matchRepositoryUrlToRemote(
  /** repository.url from package.json */
  repositoryUrl: string,
  /** Mapping from remote name to remote URL */
  remotes: Record<string, string>,
  logOrThrow: (message: string) => void = () => {}
): string | undefined {
  // Repository full name (owner and repo name) specified in package.json
  const repositoryName = getRepositoryName(repositoryUrl);

  for (const [remoteName, remoteUrl] of Object.entries(remotes)) {
    // There are many possible remote URL formats, so normalize before comparison
    const remoteRepoName = getRepositoryName(remoteUrl);
    if (remoteRepoName === repositoryName) {
      return remoteName;
    }
  }

  if (repositoryName) {
    // If `strict` is true, and repositoryName is found, there MUST be a matching remote
    logOrThrow(`Could not find remote pointing to repository "${repositoryName}"`);
  }
}

/**
 * Read and parse `packageJsonPath` and return the `repository` URL if found.
 * Calls `logOrThrow` if it can't be read or parsed.
 */
function getRepositoryUrlFromPackageJson(
  packageJsonPath: string,
  logOrThrow: (message: string) => void
): string | undefined {
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as PackageInfo;
    const { repository } = packageJson;
    return typeof repository === "string" ? repository : repository?.url;
  } catch {
    logOrThrow(`Could not read ${packageJsonPath}`);
    return undefined;
  }
}
