import type jsYamlType from "js-yaml";
import type { Catalog, Catalogs, NamedCatalogs } from "../types/Catalogs.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";

/**
 * Parse catalog definitions from raw file content for a specific workspace manager.
 * This is useful when you have already read the file content (e.g. from a different git ref)
 * and want to parse catalogs from it without reading from disk.
 *
 * @param fileContent - The raw file content (YAML for pnpm/yarn v4, JSON for midgard-yarn-strict)
 * @param manager - The workspace manager that defines the file format.
 *   Use `"yarn"` for both yarn v4 (.yarnrc.yml) and midgard-yarn-strict (package.json) formats;
 *   the function will attempt YAML parsing first, then JSON.
 *
 * @returns Catalogs if defined, or undefined if no catalogs are found in the content
 */
export function parseCatalogContent(fileContent: string, manager: WorkspaceManager): Catalogs | undefined {
  switch (manager) {
    case "pnpm":
      return parsePnpmCatalogContent(fileContent);
    case "yarn":
      return parseYarnCatalogContent(fileContent);
    case "lerna":
      // Try yarn format first (YAML then JSON), then pnpm
      return parseYarnCatalogContent(fileContent) ?? parsePnpmCatalogContent(fileContent);
    default:
      return undefined;
  }
}

function loadYaml<T>(content: string): T {
  // Delay load js-yaml to avoid perf penalty (consistent with readYaml.ts pattern)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const jsYaml: typeof jsYamlType = require("js-yaml");
  return jsYaml.load(content) as T;
}

type PnpmWorkspaceYaml = {
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

function parsePnpmCatalogContent(fileContent: string): Catalogs | undefined {
  const workspaceYaml = loadYaml<PnpmWorkspaceYaml>(fileContent);
  if (!workspaceYaml?.catalog && !workspaceYaml?.catalogs) {
    return undefined;
  }
  const { default: namedDefaultCatalog, ...namedCatalogs } = workspaceYaml.catalogs || {};
  return {
    default: workspaceYaml.catalog || namedDefaultCatalog,
    named: Object.keys(namedCatalogs).length ? namedCatalogs : undefined,
  };
}

type YarnrcYaml = {
  catalog?: Catalog;
  catalogs?: NamedCatalogs;
};

function parseYarnCatalogContent(fileContent: string): Catalogs | undefined {
  // Try YAML first (yarn v4 .yarnrc.yml format)
  try {
    const yarnrcYml = loadYaml<YarnrcYaml>(fileContent);
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
}
