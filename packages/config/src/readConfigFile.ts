import { cosmiconfig } from "cosmiconfig";
import { getWorkspaceRoot } from "workspace-tools";
import type { ConfigOptions } from "./types/ConfigOptions.js";

const ConfigModuleName = "lage";

/**
 * Read the lage config file if it exists, without filling in defaults.
 */
export async function readConfigFile(cwd: string): Promise<ConfigOptions | undefined> {
  // Verify presence of git
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  // Search for lage.config.js file
  const configExplorer = await cosmiconfig(ConfigModuleName);
  const results = await configExplorer.search(root ?? cwd);
  return results?.config || undefined;
}
