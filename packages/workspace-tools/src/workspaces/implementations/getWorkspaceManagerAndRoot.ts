import path from "path";
import { isCachingEnabled } from "../../isCachingEnabled.js";
import { searchUp } from "../../paths.js";
import { type WorkspaceManager } from "../../types/WorkspaceManager.js";

export interface WorkspaceManagerAndRoot {
  /** Workspace/monorepo manager name */
  manager: WorkspaceManager;
  /** Monorepo root, where the manager configuration file is located */
  root: string;
}

const workspaceCache = new Map<string, WorkspaceManagerAndRoot | undefined>();

/**
 * Files indicating the monorepo root for each manager.
 *
 * DO NOT REORDER! The order of keys determines the precedence of the files, which is
 * important for cases like lerna where lerna.json and e.g. yarn.lock may both exist.
 */
export const managerFiles = {
  // DO NOT REORDER! (see above)
  lerna: "lerna.json",
  rush: "rush.json",
  yarn: "yarn.lock",
  pnpm: "pnpm-workspace.yaml",
  bun: ["bun.lock", "bun.lockb"],
  npm: "package-lock.json",
} as const;

function getManagerFileNames(manager: WorkspaceManager): readonly string[] {
  const file = managerFiles[manager];
  return Array.isArray(file) ? file : [file];
}

/**
 * Get the preferred workspace/monorepo manager based on `process.env.PREFERRED_WORKSPACE_MANAGER`
 * (if valid).
 */
export function getPreferredWorkspaceManager(): WorkspaceManager | undefined {
  const preferred = process.env.PREFERRED_WORKSPACE_MANAGER as WorkspaceManager | undefined;
  return preferred && managerFiles[preferred] ? preferred : undefined;
}

/**
 * Get the workspace/monorepo manager name and root directory for `cwd`, with caching.
 *
 * @param cwd Directory to search up from
 * @param cache Optional override cache for testing
 * @param managerOverride Optional override manager (if provided, only searches for this manager's file).
 * Also respects `process.env.PREFERRED_WORKSPACE_MANAGER`.
 *
 * @returns Workspace/monorepo manager and root, or undefined if it can't be determined
 */
export function getWorkspaceManagerAndRoot(
  cwd: string,
  cache?: Map<string, WorkspaceManagerAndRoot | undefined>,
  managerOverride?: WorkspaceManager
): WorkspaceManagerAndRoot | undefined {
  cache = cache || workspaceCache;
  if (isCachingEnabled() && cache.has(cwd)) {
    return cache.get(cwd);
  }

  managerOverride ??= getPreferredWorkspaceManager();
  const filesToSearch = managerOverride
    ? getManagerFileNames(managerOverride)
    : Object.values(managerFiles).flatMap((files) => (Array.isArray(files) ? files : [files]));
  const managerFile = searchUp(filesToSearch, cwd);

  if (managerFile) {
    const managerFileName = path.basename(managerFile);
    cache.set(cwd, {
      manager:
        managerOverride ||
        (Object.keys(managerFiles) as WorkspaceManager[]).find((name) => getManagerFileNames(name).includes(managerFileName))!,
      root: path.dirname(managerFile),
    });
  } else {
    // Avoid searching again if no file was found
    cache.set(cwd, undefined);
  }

  return cache.get(cwd);
}
