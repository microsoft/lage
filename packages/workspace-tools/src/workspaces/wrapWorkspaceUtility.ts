import { logVerboseWarning } from "../logging.js";
import type { WorkspaceManager } from "../types/WorkspaceManager.js";
import { getWorkspaceManagerAndRoot, type WorkspaceManagerAndRoot } from "./implementations/index.js";

interface WrappedUtilityParams {
  /** Search for the root from here */
  cwd: string;
  /** Optional manager to use instead of auto-detecting */
  managerOverride: WorkspaceManager | undefined;
  /** What the utility is getting (for logging) */
  description: string;
}

/**
 * Wrap a workspace utility function with common error handling and messaging.
 * Also handle getting the manager and root.
 *
 * @returns The utility's return value, or undefined on error (will verbose log on error)
 */
export function wrapWorkspaceUtility<TReturn>(
  params: WrappedUtilityParams & {
    /** Implementation of the utility, which receives the detected manager and root */
    impl: (params: WorkspaceManagerAndRoot) => TReturn | undefined;
  }
): TReturn | undefined {
  const { cwd, description, impl } = params;
  let managerInfo: WorkspaceManagerAndRoot | undefined;
  try {
    managerInfo = getWorkspaceManagerAndRoot(cwd, undefined, params.managerOverride);
    if (managerInfo) {
      return impl(managerInfo);
    }
  } catch (err) {
    const manager = params.managerOverride || managerInfo?.manager || "unknown manager";
    logVerboseWarning(`Error getting ${manager} ${description} for ${cwd}:`, err);
  }
}

/**
 * Wrap a workspace utility function with common error handling and messaging.
 * Also handle getting the manager and root.
 *
 * @returns The utility's return value, or undefined on error (will verbose log on error)
 */
export async function wrapAsyncWorkspaceUtility<TReturn>(
  params: WrappedUtilityParams & {
    /** Implementation of the utility, which receives the detected manager and root */
    impl: (params: WorkspaceManagerAndRoot) => Promise<TReturn | undefined>;
  }
): Promise<TReturn | undefined> {
  const { cwd, description, impl } = params;
  let managerInfo: WorkspaceManagerAndRoot | undefined;
  try {
    managerInfo = getWorkspaceManagerAndRoot(cwd, undefined, params.managerOverride);
    if (managerInfo) {
      return await impl(managerInfo);
    }
  } catch (err) {
    const manager = params.managerOverride || managerInfo?.manager || "unknown manager";
    logVerboseWarning(`Error getting ${manager} ${description} for ${cwd}:`, err);
  }
  return undefined;
}
