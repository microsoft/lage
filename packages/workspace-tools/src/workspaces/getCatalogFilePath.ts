import path from "path";
import fs from "fs";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceManagerAndRoot } from "./implementations/index.js";
import { managerFiles } from "./implementations/getWorkspaceManagerAndRoot.js";

/**
 * Get the path to the file that contains catalog definitions for the detected workspace manager.
 * Returns undefined if the manager doesn't support catalogs, the manager can't be detected,
 * or the catalog file doesn't exist.
 *
 * @param cwd - Current working directory. It will search up from here to find the root.
 * @param managerOverride - Workspace/monorepo manager to use instead of auto-detecting
 *
 * @returns Absolute path to the catalog file, or undefined if not available
 */
export function getCatalogFilePath(cwd: string, managerOverride?: WorkspaceManager): string | undefined {
  const managerInfo = getWorkspaceManagerAndRoot(cwd, undefined, managerOverride);
  if (!managerInfo) {
    return undefined;
  }

  return getCatalogFilePathForManager(managerInfo.root, managerInfo.manager);
}

/**
 * Given a workspace root and manager, return the absolute path to the catalog file if it exists.
 */
function getCatalogFilePathForManager(root: string, manager: WorkspaceManager): string | undefined {
  switch (manager) {
    case "pnpm": {
      const filePath = path.join(root, managerFiles.pnpm);
      return fs.existsSync(filePath) ? filePath : undefined;
    }
    case "yarn": {
      // Yarn v4+ uses .yarnrc.yml for catalogs
      const yarnrcPath = path.join(root, ".yarnrc.yml");
      if (fs.existsSync(yarnrcPath)) {
        return yarnrcPath;
      }
      // Midgard-yarn-strict uses package.json
      const packageJsonPath = path.join(root, "package.json");
      return fs.existsSync(packageJsonPath) ? packageJsonPath : undefined;
    }
    case "lerna": {
      // Lerna delegates to the actual package manager; detect by lock file presence
      // (consistent with lerna.ts getActualManager logic)
      for (const actualManager of ["yarn", "pnpm"] as const) {
        if (fs.existsSync(path.join(root, managerFiles[actualManager]))) {
          return getCatalogFilePathForManager(root, actualManager);
        }
      }
      return undefined;
    }
    default:
      // npm and rush don't support catalogs
      return undefined;
  }
}
