import { cosmiconfig } from "cosmiconfig";
import { getWorkspaceRoot } from "workspace-tools";
import type { ConfigOptions } from "../types/ConfigOptions";

export async function getConfig(cwd: string): Promise<ConfigOptions> {
  // Verify presence of git
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  // Search for lage.config.js file
  const ConfigModuleName = "lage";
  const configExplorer = await cosmiconfig(ConfigModuleName);
  const results = await configExplorer.search(root ?? cwd);
  const config = results?.config;
  return {
    cacheOptions: config?.cacheOptions ?? {},
    ignore: config?.ignore ?? [],
    npmClient: config?.npmClient ?? "npm",
    pipeline: config?.pipeline ?? {},
    priorities: config?.priorities ?? [],
    repoWideChanges: config?.repoWideChanges ?? [
      "lage.config.js",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "lerna.json",
      "rush.json",
    ],
    loggerOptions: config?.loggerOptions ?? {},
    runners: config?.runners ?? {},
  };
}
