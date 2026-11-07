import glob, { type Options as GlobOptions } from "fast-glob";
import path from "path";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceUtilities, type WorkspaceManagerAndRoot } from "./implementations/index.js";
import { isCachingEnabled } from "../isCachingEnabled.js";
import { wrapWorkspaceUtility, wrapAsyncWorkspaceUtility } from "./wrapWorkspaceUtility.js";

/** Mapping from root path to resolved package paths, or undefined if there was an error */
const packagePathsCache = new Map<string, string[] | undefined>();

const globOptions: GlobOptions = {
  absolute: true,
  ignore: ["**/node_modules/**", "**/__fixtures__/**"],
  stats: false,
};

/**
 * Get a list of package folder paths in the monorepo. The list of included packages is based on
 * the manager's config file and matching package folders (which must contain package.json) on disk.
 *
 * (The list of package paths is cached per monorepo root if caching is enabled.)
 *
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Package paths, or undefined if there's any issue
 * (logs verbose warnings instead of throwing on error)
 */
export function getWorkspacePackagePaths(cwd: string, managerOverride?: WorkspaceManager): string[] | undefined {
  return wrapWorkspaceUtility({
    cwd,
    managerOverride,
    description: "workspace package paths",
    impl: ({ manager, root }) => {
      const initialResult = getInitialPathsOrGlobs({ manager, root });
      if (!initialResult || "resolvedPaths" in initialResult) {
        return initialResult?.resolvedPaths;
      }

      try {
        const globResults = glob.sync(initialResult.globs, { cwd: root, ...globOptions });
        return resolveAndCacheGlobResults({ root, globResults });
      } catch (err) {
        isCachingEnabled() && packagePathsCache.set(root, undefined);
        throw err;
      }
    },
  });
}

/**
 * Get a list of package folder paths in the monorepo. The list of included packages is based on
 * the manager's config file and matching package folders (which must contain package.json) on disk.
 *
 * (The list of package paths is cached per monorepo root if caching is enabled.)
 *
 * @param managerOverride Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Package paths, or undefined if there's any issue
 * (logs verbose warnings instead of throwing on error)
 */
export async function getWorkspacePackagePathsAsync(
  cwd: string,
  managerOverride?: WorkspaceManager
): Promise<string[] | undefined> {
  return wrapAsyncWorkspaceUtility({
    cwd,
    managerOverride,
    description: "workspace package paths",
    impl: async ({ manager, root }) => {
      const initialResult = getInitialPathsOrGlobs({ manager, root });
      if (!initialResult || "resolvedPaths" in initialResult) {
        return initialResult?.resolvedPaths;
      }

      try {
        const globResults = await glob(initialResult.globs, { cwd: root, ...globOptions });
        return resolveAndCacheGlobResults({ root, globResults });
      } catch (err) {
        isCachingEnabled() && packagePathsCache.set(root, undefined);
        throw err;
      }
    },
  });
}

/**
 * Handles the shared synchronous initial logic:
 * - Used the cached result if available
 * - Else, call `getWorkspacePackagePatterns`
 *   - If the results are relative paths (not patterns), resolve, cache, and return them
 *   - Else, return the prepared globs for sync or async resolution as appropriate.
 */
function getInitialPathsOrGlobs(
  params: WorkspaceManagerAndRoot
): { globs: string[] } | { resolvedPaths: string[] } | undefined {
  const canCache = isCachingEnabled();
  if (canCache && packagePathsCache.has(params.root)) {
    // Return the cached result, even if it was a failure
    const cachedPaths = packagePathsCache.get(params.root);
    return cachedPaths && { resolvedPaths: cachedPaths };
  }

  const managerUtilities = getWorkspaceUtilities(params.manager);
  const managerSetting = managerUtilities.getWorkspacePatterns({ root: params.root });

  if (managerSetting?.type === "pattern") {
    return {
      globs: managerSetting.patterns.map((p) => path.join(p, "package.json").replace(/\\/g, "/")),
    };
  }

  if (managerSetting?.type === "path") {
    const resolvedPaths = managerSetting.patterns.map((p) => path.resolve(params.root, p));
    if (canCache) {
      packagePathsCache.set(params.root, resolvedPaths);
    }
    return { resolvedPaths };
  }

  return undefined;
}

/**
 * Given the results from globbing package.json files, resolve to package folder paths
 * and cache the results.
 */
function resolveAndCacheGlobResults(params: { root: string; globResults: string[] }) {
  const { root, globResults } = params;
  const resolvedPaths = globResults.map((packageJsonPath) => {
    const packagePath = path.dirname(packageJsonPath);
    return path.sep === "/" ? packagePath : packagePath.replace(/\//g, path.sep);
  });
  if (isCachingEnabled()) {
    packagePathsCache.set(root, resolvedPaths);
  }
  return resolvedPaths;
}
