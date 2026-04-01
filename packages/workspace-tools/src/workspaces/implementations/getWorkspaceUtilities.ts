import type { WorkspaceManager } from "../../types/WorkspaceManager.js";
import type { WorkspaceUtilities } from "./WorkspaceUtilities.js";

const utils: Partial<Record<WorkspaceManager, WorkspaceUtilities>> = {};

/**
 * Get utility implementations for the given workspace/monorepo manager.
 */
export function getWorkspaceUtilities(manager: WorkspaceManager): WorkspaceUtilities {
  switch (manager) {
    case "npm":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      utils.npm ??= (require("./npm") as typeof import("./npm")).npmUtilities;
      break;

    case "pnpm":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      utils.pnpm ??= (require("./pnpm") as typeof import("./pnpm")).pnpmUtilities;
      break;

    case "yarn":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      utils.yarn ??= (require("./yarn") as typeof import("./yarn")).yarnUtilities;
      break;

    case "rush":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      utils.rush ??= (require("./rush") as typeof import("./rush")).rushUtilities;
      break;

    case "lerna":
      // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-require-imports
      utils.lerna ??= (require("./lerna") as typeof import("./lerna")).lernaUtilities;
      break;
  }

  return utils[manager]!;
}
