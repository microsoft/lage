import { getBranchChanges } from "workspace-tools";
import * as fg from "fast-glob";
import type { TargetLogger } from "@lage-run/reporters";

export interface RepoChanges {
  hasChanged: boolean;
  changedFiles: string[] | null;
}

/**
 * Find `environmentGlob` files that changed since the `--since` ref.
 * A null file list indicates that detection failed and a full build is required.
 */
export function getRepoChanges(params: {
  /** `--since` CLI arg */
  since: string;
  /** Absolute path to monorepo root */
  root: string;
  /** `environmentGlob` from cache config */
  environmentGlob: string[];
  logger: TargetLogger;
}): RepoChanges {
  const { since, root, environmentGlob, logger } = params;

  if (!environmentGlob.length) {
    // Following old logic: if no environmentGlob, it hasn't changed
    return { hasChanged: false, changedFiles: [] };
  }

  try {
    const changedFiles = getBranchChanges({
      branch: since,
      cwd: root,
    });
    if (!changedFiles.length) {
      return { hasChanged: false, changedFiles: [] };
    }

    const envFiles = fg.sync(environmentGlob, { cwd: root });

    const repoWideChangedFiles = envFiles.filter((envFile) => changedFiles.includes(envFile));
    return { hasChanged: repoWideChangedFiles.length > 0, changedFiles: repoWideChangedFiles };
  } catch (e) {
    // if this fails, let's assume repo has changed
    logger.warn(`An error in the git command has caused this to consider the repo has changed\n${e}`);
    return { hasChanged: true, changedFiles: null };
  }
}
