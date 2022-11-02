import { WorkspaceInfo, ParsedLock, getWorkspaceRoot, getWorkspaces, parseLockFile } from "workspace-tools";

import { getPackageDeps } from "./getPackageDeps";
import { createPackageHashes } from "./createPackageHashes";

export interface RepoInfo {
  root: string;
  workspaceInfo: WorkspaceInfo;
  parsedLock: ParsedLock;
  repoHashes: { [key: string]: string };
  packageHashes: Record<string, [string, string][]>;
}

const repoInfoCache: RepoInfo[] = [];

/**
 * repoInfo cache lookup - it is specialized to be using a substring match to make it run as fast as possible
 * @param packageRoot
 */
function searchRepoInfoCache(packageRoot: string) {
  for (const repoInfo of repoInfoCache) {
    if (repoInfo.workspaceInfo && packageRoot.startsWith(repoInfo.root)) {
      return repoInfo;
    }
  }
}

export async function getRepoInfoNoCache(cwd: string) {
  const root = getWorkspaceRoot(cwd);

  if (!root) {
    throw new Error("Cannot initialize Repo class without a workspace root");
  }

  // Assuming the package-deps-hash package returns a map of files to hashes that are unordered
  const unorderedRepoHashes = Object.fromEntries(getPackageDeps(root));

  // Sorting repoHash by key because we want to consistent hashing based on the order of the files
  const repoHashes = Object.keys(unorderedRepoHashes)
    .sort((a, b) => a.localeCompare(b))
    .reduce((obj, key) => {
      obj[key] = unorderedRepoHashes[key];
      return obj;
    }, {} as Record<string, string>);

  const workspaceInfo = getWorkspaces(root);
  const parsedLock = await parseLockFile(root);
  const packageHashes = createPackageHashes(root, workspaceInfo, repoHashes);

  const repoInfo = {
    root,
    workspaceInfo,
    parsedLock,
    repoHashes,
    packageHashes,
  };

  repoInfoCache.push(repoInfo);

  return repoInfo;
}

// A promise to guarantee the getRepoInfo is done one at a time
let oneAtATime: Promise<any> = Promise.resolve();

/**
 * Retrieves the repoInfo, one at a time
 *
 * No parallel of this function is allowed; this maximizes the cache hit even
 * though the getWorkspaces and parseLockFile are async functions from workspace-tools
 *
 * @param cwd
 */
export async function getRepoInfo(cwd: string): Promise<RepoInfo> {
  oneAtATime = oneAtATime.then(async () => {
    const searchResult = searchRepoInfoCache(cwd);
    if (searchResult) {
      return searchResult;
    }
    return getRepoInfoNoCache(cwd);
  });

  return oneAtATime;
}
