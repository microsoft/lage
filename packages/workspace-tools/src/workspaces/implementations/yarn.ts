import fs from "fs";
import path from "path";
import { parseYaml } from "../../lockfile/readYaml.js";
import type { Catalog, NamedCatalogs } from "../../types/Catalogs.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";
import { getPackageJsonWorkspacePatterns } from "./getPackageJsonWorkspacePatterns.js";
import type { PackageInfo } from "../../types/PackageInfo.js";

type YarnrcYaml = {
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

function getYarnrcYmlPath(params: { root: string }): string {
  return path.join(params.root, ".yarnrc.yml");
}

export const yarnUtilities: Required<WorkspaceUtilities> = {
  getWorkspacePatterns: getPackageJsonWorkspacePatterns,

  // See https://yarnpkg.com/features/catalogs
  getCatalogs: ({ root }) => {
    const catalogFilePath = yarnUtilities.getCatalogFilePath({ root })!.filePath;
    return yarnUtilities.parseCatalogContent({
      fileContent: fs.readFileSync(catalogFilePath, "utf8"),
    });
  },

  getCatalogFilePath: ({ root }) => {
    let filePath: string;
    // Yarn v4+ uses .yarnrc.yml for catalogs
    const yarnrcPath = getYarnrcYmlPath({ root });
    if (fs.existsSync(yarnrcPath)) {
      filePath = yarnrcPath;
    } else {
      // midgard-yarn-strict uses package.json.
      // It's okay to return package.json even if it might not have catalogs.
      filePath = path.join(root, "package.json");
    }
    return { filePath, manager: "yarn" };
  },

  parseCatalogContent: ({ fileContent }) => {
    // fileContent might be either JSON (midgard-yarn-strict package.json) or YAML (.yarnrc.yml).
    // Try JSON first.
    try {
      // Check for midgard-yarn-strict definition of catalogs in package.json
      const packageJson = JSON.parse(fileContent) as PackageInfo;
      const workspaceSettings = packageJson.workspaces;

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

      // Valid JSON but no catalogs found (don't try to parse as YAML)
      return undefined;
    } catch {
      // ignore
    }

    // Try Yarn v4+ format (allow this one to throw if not valid YAML)
    const yarnrcYml = parseYaml<YarnrcYaml>(fileContent);
    if (yarnrcYml?.catalog || yarnrcYml?.catalogs) {
      return { default: yarnrcYml.catalog, named: yarnrcYml.catalogs };
    }
    return undefined;
  },
};
