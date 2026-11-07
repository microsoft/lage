import { logVerboseWarning } from "../logging.js";
import { getWorkspaceManagerAndRoot } from "./implementations/index.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";

/**
 * Get the root directory of a monorepo, defined as the directory where the workspace/monorepo manager
 * config file is located. (Does not rely in any way on git, and the result is cached by `cwd`.)
 *
 * @param cwd Start searching from here
 * @param managerOverride Search for only this manager's config file
 *
 * @returns Workspace manager root directory. Returns undefined (and verbose logs) on error or if
 * not found, unless `throwOnError` is set.
 */
export function getWorkspaceManagerRoot(cwd: string, managerOverride?: WorkspaceManager): string | undefined;
export function getWorkspaceManagerRoot(
  cwd: string,
  managerOverride: WorkspaceManager | undefined,
  options?: {
    /** Throw if there's an error or if the root is not found */
    throwOnError: true;
  }
): string;
export function getWorkspaceManagerRoot(
  cwd: string,
  managerOverride?: WorkspaceManager,
  options?: { throwOnError: true }
): string | undefined {
  const logOrThrow = (message: string) => {
    if (options?.throwOnError) {
      throw new Error(message);
    } else {
      logVerboseWarning(message);
    }
  };

  let root: string | undefined;
  try {
    root = getWorkspaceManagerAndRoot(cwd, undefined, managerOverride)?.root;
  } catch (err) {
    logOrThrow(`Error getting ${managerOverride || "workspace/monorepo manager"} root from ${cwd}: ${err}`);
    return;
  }

  if (!root) {
    logOrThrow(`Could not find ${managerOverride || "workspace/monorepo manager"} root from ${cwd}`);
  }
  return root;
}
