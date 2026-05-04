import { logVerboseWarning } from "../logging.js";
import type { Catalogs } from "../types/Catalogs.js";
import { getWorkspaceUtilities } from "./implementations/index.js";

/**
 * Parse catalog definitions from raw file content.
 *
 * Normally you should use just `getCatalogs`, but this is useful when you've already read the
 * file content (e.g. from a different git ref) and need to parse catalogs from it.
 *
 * @param fileContent - The raw file content (YAML for pnpm/yarn v4, JSON for midgard-yarn-strict)
 * @param manager - The underlying manager to use for parsing (as returned by `getCatalogFilePath`)
 *
 * @returns Catalogs if defined, or undefined if no catalogs are found in the content
 */
export function parseCatalogContent(fileContent: string, manager: "yarn" | "pnpm"): Catalogs | undefined {
  try {
    return getWorkspaceUtilities(manager).parseCatalogContent?.({ fileContent });
  } catch (err) {
    logVerboseWarning(`Error parsing ${manager} catalog content:`, err);
  }
  return undefined;
}
