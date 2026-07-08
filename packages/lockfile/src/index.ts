import { loadPnpmLockfileGraph, parsePnpmLockfileGraph, PNPM_LOCKFILE_NAME } from "./loadLockfileGraph.js";
import type { ExperimentalLockfileInvalidationOptions, LockfileGraphResult } from "./types.js";

export type { ExperimentalLockfileInvalidationOptions, LockfileGraph, LockfileGraphResult, LockfilePackageManager } from "./types.js";
export { supportedLockfilePackageManagers } from "./types.js";
export {
  diffPackageSignatures,
  loadPnpmLockfileGraph,
  mapImporterSignaturesToPackages,
  parsePnpmLockfileGraph,
  PNPM_LOCKFILE_NAME,
} from "./loadLockfileGraph.js";
export { isSupportedPnpmLockfileVersion } from "./pnpmLockfileGraph.js";

/**
 * Returns the lockfile file name for the configured package manager.
 */
export function getLockfileName(options: ExperimentalLockfileInvalidationOptions): string {
  switch (options.packageManager) {
    case "pnpm":
      return PNPM_LOCKFILE_NAME;
    default:
      return PNPM_LOCKFILE_NAME;
  }
}

/**
 * Loads and analyzes the current lockfile at the repo root for the configured package manager.
 */
export function loadLockfileGraph(options: ExperimentalLockfileInvalidationOptions, root: string): LockfileGraphResult {
  switch (options.packageManager) {
    case "pnpm":
      return loadPnpmLockfileGraph(root);
    default:
      return { status: "unsupported", reason: `unsupported package manager "${options.packageManager}"` };
  }
}

/**
 * Parses raw lockfile content for the configured package manager (e.g. an older lockfile obtained
 * from `git show <ref>:<lockfile>`).
 */
export function parseLockfileGraph(options: ExperimentalLockfileInvalidationOptions, rawContent: string): LockfileGraphResult {
  switch (options.packageManager) {
    case "pnpm":
      return parsePnpmLockfileGraph(rawContent);
    default:
      return { status: "unsupported", reason: `unsupported package manager "${options.packageManager}"` };
  }
}
