import { cosmiconfigSync } from "cosmiconfig";
import { getWorkspaceRoot } from "workspace-tools";
import { ConfigOptions } from "../types/ConfigOptions";

export function getConfig(cwd: string): ConfigOptions {
  // Verify presence of git
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }

  // Search for lage.config.js file
  const ConfigModuleName = "lage";
  const configResults = cosmiconfigSync(ConfigModuleName).search(root ?? cwd);
  return {
    cacheOptions: configResults?.config.cacheOptions ?? {},
    ignore: configResults?.config.ignore ?? [],
    npmClient: configResults?.config.npmClient ?? "npm",
    pipeline: configResults?.config.pipeline ?? {},
    priorities: configResults?.config.priorities ?? [],
    repoWideChanges: configResults?.config.repoWideChanges ?? [
      "lage.config.js",
      "package-lock.json",
      "yarn.lock",
      "pnpm-lock.yaml",
      "lerna.json",
      "rush.json",
    ],
    loggerOptions: configResults?.config.loggerOptions ?? {},
  };
}
