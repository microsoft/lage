/**
 * Supported package managers for experimental lockfile invalidation.
 *
 * Only `pnpm` is supported today. Strict, deterministic lockfiles (like pnpm's) are what make
 * the per-package closure analysis reliable. Other package managers intentionally fall back to
 * Lage's previous blanket invalidation behavior.
 */
export type LockfilePackageManager = "pnpm";

export const supportedLockfilePackageManagers: readonly LockfilePackageManager[] = ["pnpm"];

/**
 * Experimental opt-in configuration for smarter lockfile invalidation.
 */
export interface ExperimentalLockfileInvalidationOptions {
  /** The package manager whose lockfile should be analyzed. Only `"pnpm"` is supported today. */
  packageManager: LockfilePackageManager;
}

/**
 * The result of loading and analyzing a lockfile.
 */
export type LockfileGraphResult =
  | { status: "success"; graph: LockfileGraph }
  | { status: "no-lockfile" }
  | { status: "unsupported"; reason: string };

/**
 * A lockfile graph exposes, for each workspace project (importer), a single stable signature that
 * captures that project's entire resolved external dependency closure. Two lockfiles that resolve
 * a given project's dependency graph identically will produce the same signature for that project.
 */
export interface LockfileGraph {
  /** Map of importer id (posix-relative path from the repo root) to a closure signature. */
  readonly importerSignatures: ReadonlyMap<string, string>;
}
