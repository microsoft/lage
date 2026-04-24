import fs from "fs";
import path from "path";
import type jsYamlType from "js-yaml";
import type { Catalog, NamedCatalogs } from "../../types/Catalogs.js";
import { managerFiles } from "./getWorkspaceManagerAndRoot.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

type PnpmWorkspaceYaml = {
  packages: string[];
  // Format per https://pnpm.io/catalogs
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

function loadYaml<T>(content: string): T {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsYaml: typeof jsYamlType = require("js-yaml");
  return jsYaml.load(content) as T;
}

function getPnpmWorkspaceYaml(params: { root: string }): PnpmWorkspaceYaml {
  const pnpmWorkspacesFile = path.join(params.root, managerFiles.pnpm);
  const content = fs.readFileSync(pnpmWorkspacesFile, "utf8");
  return loadYaml<PnpmWorkspaceYaml>(content);
}

export const pnpmUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: (params) => {
    const { packages } = getPnpmWorkspaceYaml(params);
    return packages ? { patterns: packages, type: "pattern" } : undefined;
  },

  // See https://pnpm.io/catalogs
  getCatalogs: (params) => {
    const workspaceYaml = getPnpmWorkspaceYaml(params);
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

  getCatalogFilePath: ({ root }) => {
    const filePath = path.join(root, managerFiles.pnpm);
    return fs.existsSync(filePath) ? filePath : undefined;
  },

  parseCatalogContent: ({ fileContent }) => {
    const workspaceYaml = loadYaml<PnpmWorkspaceYaml>(fileContent);
    if (!workspaceYaml?.catalog && !workspaceYaml?.catalogs) {
      return undefined;
    }
    const { default: namedDefaultCatalog, ...namedCatalogs } = workspaceYaml.catalogs || {};
    return {
      default: workspaceYaml.catalog || namedDefaultCatalog,
      named: Object.keys(namedCatalogs).length ? namedCatalogs : undefined,
    };
  },
};
