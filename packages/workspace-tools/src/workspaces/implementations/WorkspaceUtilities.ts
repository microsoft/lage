import type { Catalogs } from "../../types/Catalogs.js";

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
   */
  getCatalogFilePath?: (params: { root: string }) => string;

  /**
   * Parse catalog definitions from raw file content (e.g. read from a different git ref).
   * Returns undefined if no catalogs are found in the content or catalogs aren't supported.
   */
  parseCatalogContent?: (params: {
    fileContent: string;
    /** In this case, only needed by lerna to determine which actual manager's parsing logic to use */
    root: string;
  }) => Catalogs | undefined;
}
