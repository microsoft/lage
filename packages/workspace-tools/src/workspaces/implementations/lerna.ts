import fs from "fs";
import jju from "jju";
import path from "path";
import { isCachingEnabled } from "../../isCachingEnabled.js";
import { managerFiles } from "./getWorkspaceManagerAndRoot.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

export const lernaUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: ({ root }) => {
    const lernaJsonPath = path.join(root, managerFiles.lerna);
    const lernaConfig = jju.parse(fs.readFileSync(lernaJsonPath, "utf-8")) as { packages?: string[] };
    if (lernaConfig.packages) {
      return { patterns: lernaConfig.packages, type: "pattern" };
    }

    // Newer lerna versions also pick up workspaces from the package manager.
    const actualManager = getActualManager({ root });
    if (!actualManager) {
      throw new Error(`${lernaJsonPath} does not define "packages", and no known package manager was found.`);
    }

    const managerUtils = getManagerUtils(actualManager);
    return managerUtils.getWorkspacePatterns({ root });
  },

  // lerna could theoretically use yarn or pnpm catalogs
  getCatalogs: (params) => {
    const actualManager = getActualManager(params);
    return actualManager && getManagerUtils(actualManager).getCatalogs?.(params);
  },

  getCatalogFilePath: (params) => {
    const actualManager = getActualManager(params);
    return actualManager && getManagerUtils(actualManager).getCatalogFilePath?.(params);
  },
};

/** Mapping from lerna repo root to actual package manager */
const managerCache = new Map<string, "yarn" | "pnpm" | "npm" | undefined>();

/**
 * Get the actual package manager used by a lerna monorepo (with caching).
 */
function getActualManager(params: { root: string }): "yarn" | "pnpm" | "npm" | undefined {
  const { root } = params;
  if (isCachingEnabled() && managerCache.has(root)) {
    return managerCache.get(root);
  }

  for (const manager of ["npm", "yarn", "pnpm"] as const) {
    const managerPath = path.join(root, managerFiles[manager]);
    if (fs.existsSync(managerPath)) {
      managerCache.set(root, manager);
      return manager;
    }
  }

  managerCache.set(root, undefined);
  return undefined;
}

function getManagerUtils(manager: "npm" | "yarn" | "pnpm"): WorkspaceUtilities {
  switch (manager) {
    case "npm":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      return (require("./npm") as typeof import("./npm")).npmUtilities;
    case "yarn":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      return (require("./yarn") as typeof import("./yarn")).yarnUtilities;
    case "pnpm":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      return (require("./pnpm") as typeof import("./pnpm")).pnpmUtilities;
  }
}
