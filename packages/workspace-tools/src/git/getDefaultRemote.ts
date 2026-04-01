import fs from "fs";
import path from "path";
import { findGitRoot } from "../paths.js";
import { type PackageInfo } from "../types/PackageInfo.js";
import { getRepositoryName } from "./getRepositoryName.js";
import { git } from "./git.js";

export type GetDefaultRemoteOptions = {
  /** Get repository info relative to this directory. */
  cwd: string;
  /**
   * If true, throw an error if remote info can't be found, or if a `repository` is not specified
   * in package.json and no matching remote is found.
   */
  strict?: boolean;
  /** If true, log debug messages about how the remote was chosen */
  verbose?: boolean;
};

/**
 * Get the name of the default remote: the one matching the `repository` field in package.json.
 * Throws if `options.cwd` is not in a git repo or there's no package.json at the repo root.
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

  const gitRoot = findGitRoot(cwd);

  let packageJson: Partial<PackageInfo> = {};
  const packageJsonPath = path.join(gitRoot, "package.json");
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8").trim());
  } catch {
    logOrThrow(`Could not read "${packageJsonPath}"`);
  }

  const { repository } = packageJson;
  const repositoryUrl = typeof repository === "string" ? repository : (repository && repository.url) || "";
  if (!repositoryUrl) {
    // This is always logged because it's strongly recommended to fix
    console.log(
      `Valid "repository" key not found in "${packageJsonPath}". Consider adding this info for more accurate git remote detection.`
    );
  }
  /** Repository full name (owner and repo name) specified in package.json */
  const repositoryName = getRepositoryName(repositoryUrl);

  const remotesResult = git(["remote", "-v"], { cwd });
  if (!remotesResult.success) {
    logOrThrow(`Could not determine available git remotes under "${cwd}"`);
  }

  /** Mapping from remote URL to full name (owner and repo name) */
  const remotes: { [remoteRepoUrl: string]: string } = {};
  remotesResult.stdout.split("\n").forEach((line) => {
    const [remoteName, remoteUrl] = line.split(/\s+/);
    const remoteRepoName = getRepositoryName(remoteUrl);
    if (remoteRepoName) {
      remotes[remoteRepoName] = remoteName;
    }
  });

  if (repositoryName) {
    // If the repository name was found in package.json, check for a matching remote
    if (remotes[repositoryName]) {
      return remotes[repositoryName];
    }

    // If `strict` is true, and repositoryName is found, there MUST be a matching remote
    logOrThrow(`Could not find remote pointing to repository "${repositoryName}".`);
  }

  // Default to upstream or origin if available, or the first remote otherwise
  const allRemoteNames = Object.values(remotes);
  const fallbacks = ["upstream", "origin", ...allRemoteNames];
  for (const fallback of fallbacks) {
    if (allRemoteNames.includes(fallback)) {
      log(`Default to remote "${fallback}"`);
      return fallback;
    }
  }

  // If we get here, no git remotes were found. This should probably always be an error (since
  // subsequent operations which require a remote likely won't work), but to match old behavior,
  // still default to "origin" unless `strict` is true.
  logOrThrow(`Could not find any remotes in git repo at "${gitRoot}".`);
  log(`Assuming default remote "origin".`);
  return "origin";
}
