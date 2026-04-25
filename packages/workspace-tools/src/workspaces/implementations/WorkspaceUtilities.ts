import type { Catalogs } from "../../types/Catalogs.js";

export interface CatalogFilePathResult {
  filePath: string;
  /** Actual underlying manager. This is needed for parsing later in the case of lerna. */
  manager: "yarn" | "pnpm";
}

/**
 * Manager-specific implementations used internally by other workspace/monorepo utilities.
 */
export interface WorkspaceUtilities {
  /**
   * Get the original glob patterns or package paths from the manager's workspaces config.
   * (If workspaces are defined in package.json `workspaces`, use `getPackageJsonWorkspacePatterns`.)
   *
   * @returns Object with the patterns, or undefined if not available (or it can throw
   * if the patterns aren't available or there's an error)
   */
  // use object params so it's obvious the root is expected
  getWorkspacePatterns: (params: { root: string }) =>
    | {
        patterns: string[];
        /** "pattern" means the strings may be globs, "path" means they're relative paths */
        type: "pattern" | "path";
      }
    | undefined;

  /**
   * Get version catalogs, if supported by the manager (only pnpm and yarn v4 as of writing).
   * Returns undefined if not defined or not supported, or can throw an error.
   */
  getCatalogs?: (params: { root: string }) => Catalogs | undefined;

  /**
   * Get the absolute path to the file that may contain catalog definitions, if supported.
   * Returns undefined if the actual manager doesn't support catalogs.
   */
  getCatalogFilePath?: (params: { root: string }) => CatalogFilePathResult | undefined;
  /**
   * Parse catalog definitions from raw file content (e.g. read from a different git ref).
   * Returns undefined if no catalogs are found in the content or catalogs aren't supported.
   */
  parseCatalogContent?: (params: { fileContent: string }) => Catalogs | undefined;
}
