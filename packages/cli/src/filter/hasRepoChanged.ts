import { getBranchChanges } from "workspace-tools";
import * as fg from "fast-glob";
import type { Logger } from "@lage-run/logger";

export function hasRepoChanged(since: string, root: string, environmentGlob: string[], logger: Logger) {
  try {
    const changedFiles = getBranchChanges(since, root);
    const envFiles = fg.sync(environmentGlob, { cwd: root });
    let repoWideChanged = false;

    if (changedFiles) {
      for (const change of changedFiles) {
        if (envFiles.includes(change)) {
          repoWideChanged = true;
          break;
        }
      }
    }

    return repoWideChanged;
  } catch (e) {
    // if this fails, let's assume repo has changed
    logger.warn(`An error in the git command has caused this to consider the repo has changed\n${e}`);
    return true;
  }
}
