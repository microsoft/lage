import fs from "fs";
import path from "path";
import { parseYaml } from "../../lockfile/readYaml.js";
import type { Catalog, NamedCatalogs } from "../../types/Catalogs.js";
import { managerFiles } from "./getWorkspaceManagerAndRoot.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

type PnpmWorkspaceYaml = {
  packages: string[];
  // Format per https://pnpm.io/catalogs
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

function getPnpmWorkspacesPath(params: { root: string }): string {
  return path.join(params.root, managerFiles.pnpm);
}

export const pnpmUtilities: Required<WorkspaceUtilities> = {
  getWorkspacePatterns: (params) => {
    const pnpmWorkspacesFile = getPnpmWorkspacesPath(params);
    const { packages } = parseYaml<PnpmWorkspaceYaml>(fs.readFileSync(pnpmWorkspacesFile, "utf8"));
    return packages ? { patterns: packages, type: "pattern" } : undefined;
  },

  // See https://pnpm.io/catalogs
  getCatalogs: (params) => {
    const pnpmWorkspacesFile = getPnpmWorkspacesPath(params);
    return pnpmUtilities.parseCatalogContent({ fileContent: fs.readFileSync(pnpmWorkspacesFile, "utf8") });
  },

  getCatalogFilePath: (params) => {
    return { filePath: getPnpmWorkspacesPath(params), manager: "pnpm" };
  },

  parseCatalogContent: ({ fileContent }) => {
    const workspaceYaml = parseYaml<PnpmWorkspaceYaml>(fileContent);
    if (!workspaceYaml.catalog && !workspaceYaml.catalogs) {
      return undefined;
    }
    // pnpm treats catalog: and catalog:default as the same (and errors if both are defined),
    // so treat the catalog named "default" as the default if present.
    const { default: namedDefaultCatalog, ...namedCatalogs } = workspaceYaml.catalogs || {};
    return {
      default: workspaceYaml.catalog || namedDefaultCatalog,
      named: Object.keys(namedCatalogs).length ? namedCatalogs : undefined,
    };
  },
};
