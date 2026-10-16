import { getChangesBetweenRefs, getDefaultRemoteBranch, getStagedChanges, getUnstagedChanges, getUntrackedChanges } from "workspace-tools";
import micromatch from "micromatch";
import type { TargetLogger } from "@lage-run/reporters";
import type { ConfigOptions } from "@lage-run/config";
import type { FilterCliOptions } from "../commands/options.js";

/** Git change detection result */
export type ChangedFiles =
  | {
      /**
       * - `"skipped"`: `since` is undefined, so change detection was skipped.
       * - `"failed"`: An error occurred while trying to read changes from git, so assume all packages have changed.
       * - `"success"`: Changes were successfully detected and listed.
       */
      status: "skipped";
    }
  | {
      status: "failed";
    }
  | {
      status: "success";
      /** All changed files in the repo (committed or not), relative to the root with forward slashes. */
      changedFiles: string[];
      /**
       * All changed files in the repo that match `repoWideChanges`, relative to the root with forward slashes.
       * If `repoWideChanges` is empty, this will be empty.
       */
      repoWideChangedFiles: string[];
    };

/**
 * Collect branch and working-copy changes once for a command.
 * If `since` is undefined, detection is skipped.
 */
export function getChangedFiles(
  params: Pick<ConfigOptions, "repoWideChanges"> &
    Pick<FilterCliOptions, "since"> & {
      /** Absolute path to monorepo root */
      root: string;
      logger: TargetLogger;
    }
): ChangedFiles {
  const { since, root, repoWideChanges, logger } = params;

  if (since === undefined) {
    return { status: "skipped" };
  }

  try {
    const sinceChanges = getChangesBetweenRefs({
      fromRef: since || getDefaultRemoteBranch({ cwd: root }),
      cwd: root,
    });
    const changedFiles = [
      ...new Set([
        ...getUntrackedChanges({ cwd: root }),
        ...getUnstagedChanges({ cwd: root }),
        ...getStagedChanges({ cwd: root }),
        ...sinceChanges,
      ]),
    ];
    const repoWideChangedFiles = repoWideChanges.length ? micromatch(changedFiles, repoWideChanges) : [];

    return { status: "success", changedFiles, repoWideChangedFiles };
  } catch (e) {
    logger.warn(`An error occurred reading changes from git, so lage will assume all packages have changed. Original error:\n${e}`);
    return { status: "failed" };
  }
}
