import type { Catalogs } from "../types/Catalogs.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceUtilities } from "./implementations/index.js";

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
  return getWorkspaceUtilities(manager).parseCatalogContent?.({ fileContent });
}
