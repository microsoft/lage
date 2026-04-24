import fs from "fs";
import path from "path";
import { parseYaml } from "../../lockfile/readYaml.js";
import { getPackageInfo } from "../../getPackageInfo.js";
import type { Catalog, NamedCatalogs } from "../../types/Catalogs.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";
import { getPackageJsonWorkspacePatterns } from "./getPackageJsonWorkspacePatterns.js";

type YarnrcYaml = {
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

export const yarnUtilities: WorkspaceUtilities = {
  getWorkspacePatterns: getPackageJsonWorkspacePatterns,

  // See https://yarnpkg.com/features/catalogs
  getCatalogs: ({ root }) => {
    const yarnrcYmlPath = path.join(root, ".yarnrc.yml");
    if (fs.existsSync(yarnrcYmlPath)) {
      const yarnrcYml = parseYaml<YarnrcYaml>(fs.readFileSync(yarnrcYmlPath, "utf8"));
      if (yarnrcYml?.catalog || yarnrcYml?.catalogs) {
        // Yarn v4+ format
        return { default: yarnrcYml.catalog, named: yarnrcYml.catalogs };
      }
    } else {
      // Check for midgard-yarn-strict definition of catalogs in package.json
      const workspaceSettings = getPackageInfo(root)?.workspaces;
      if (
        workspaceSettings &&
        !Array.isArray(workspaceSettings) &&
        (workspaceSettings?.catalog || workspaceSettings?.catalogs)
      ) {
        // This probably handles a catalog named "default" as the default catalog
        const { default: namedDefaultCatalog, ...namedCatalogs } = workspaceSettings.catalogs || {};
        return {
          default: workspaceSettings.catalog || namedDefaultCatalog,
          named: Object.keys(namedCatalogs).length ? namedCatalogs : undefined,
        };
      }
    }
    return undefined;
  },

  getCatalogFilePath: ({ root }) => {
    // Yarn v4+ uses .yarnrc.yml for catalogs
    const yarnrcPath = path.join(root, ".yarnrc.yml");
    if (fs.existsSync(yarnrcPath)) {
      return yarnrcPath;
    }
    // Midgard-yarn-strict uses package.json
    const packageJsonPath = path.join(root, "package.json");
    return fs.existsSync(packageJsonPath) ? packageJsonPath : undefined;
  },

  parseCatalogContent: ({ fileContent }) => {
    // Try YAML first (yarn v4 .yarnrc.yml format)
    try {
      const yarnrcYml = parseYaml<YarnrcYaml>(fileContent);
      if (yarnrcYml?.catalog || yarnrcYml?.catalogs) {
        return { default: yarnrcYml.catalog, named: yarnrcYml.catalogs };
      }
    } catch {
      // Not valid YAML, try JSON below
    }

    // Try JSON (midgard-yarn-strict package.json format)
    try {
      const packageJson = JSON.parse(fileContent) as {
        workspaces?: {
          catalog?: Catalog;
          catalogs?: NamedCatalogs;
        };
      };
      const workspaceSettings = packageJson?.workspaces;
      if (workspaceSettings && (workspaceSettings.catalog || workspaceSettings.catalogs)) {
        const { default: namedDefaultCatalog, ...namedCatalogs } = workspaceSettings.catalogs || {};
        return {
          default: workspaceSettings.catalog || namedDefaultCatalog,
          named: Object.keys(namedCatalogs).length ? namedCatalogs : undefined,
        };
      }
    } catch {
      // Not valid JSON either
    }

    return undefined;
  },
};
