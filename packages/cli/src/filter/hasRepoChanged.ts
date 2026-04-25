import { getBranchChanges } from "workspace-tools";
import * as fg from "fast-glob";
import type { TargetLogger } from "@lage-run/reporters";

/**
 * Check whether any `environmentGlob` files have changed since the `--since` ref.
 * If `environmentGlob` is empty, it returns false.
 */
export function hasRepoChanged(params: {
  /** `--since` CLI arg */
  since: string;
  /** Absolute path to monorepo root */
  root: string;
  /** `environmentGlob` from cache config */
  environmentGlob: string[];
  logger: TargetLogger;
}): boolean {
  const { since, root, environmentGlob, logger } = params;

  if (!environmentGlob.length) {
    // Following old logic: if no environmentGlob, it hasn't changed
    return false;
  }

  try {
    const changedFiles = getBranchChanges({
      branch: since,
      cwd: root,
    });
    if (!changedFiles.length) {
      return false;
    }

    const envFiles = fg.sync(environmentGlob, { cwd: root });

    return envFiles.some((envFile) => changedFiles.includes(envFile));
  } catch (e) {
    // if this fails, let's assume repo has changed
    logger.warn(`An error in the git command has caused this to consider the repo has changed\n${e}`);
    return true;
  }
}
