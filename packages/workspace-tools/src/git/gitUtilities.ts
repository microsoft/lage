// File preserved for compatibility with existing imports.
// New utilities don't need to be added here.

export { getBranchName, getFullBranchRef, getRemoteBranch, getShortBranchName } from "./branchRefs.js";
export { getDefaultBranch, getUserEmail } from "./config.js";
export { fetchRemote, fetchRemoteBranch } from "./fetchRemote.js";
export {
  getBranchChanges,
  getChanges,
  getChangesBetweenRefs,
  getStagedChanges,
  getUnstagedChanges,
  getUntrackedChanges,
} from "./getChanges.js";
export { getCurrentHash } from "./getCurrentHash.js";
export { getFileAddedHash } from "./getFileAddedHash.js";
export { getRecentCommitMessages } from "./getRecentCommitMessages.js";
export { init } from "./init.js";
export { listAllTrackedFiles } from "./listAllTrackedFiles.js";
export { parseRemoteBranch } from "./parseRemoteBranch.js";
export { revertLocalChanges } from "./revertLocalChanges.js";
export { commit, stage, stageAndCommit } from "./stageAndCommit.js";

import { getBranchName } from "./branchRefs.js";
import { git } from "./git.js";

/**
 * Attempts to determine the parent branch of the current branch using `git show-branch`.
 * @returns The parent branch name if found, null otherwise
 * @deprecated Does not appear to be used
 */
export function getParentBranch(cwd: string): string | null {
  const branchName = getBranchName({ cwd });

  if (!branchName || branchName === "HEAD") {
    return null;
  }

  const showBranchResult = git(["show-branch", "-a"], { cwd });

  if (showBranchResult.success) {
    const showBranchLines = showBranchResult.stdout.split(/\n/);
    const parentLine = showBranchLines.find(
      (line) => line.includes("*") && !line.includes(branchName) && !line.includes("publish_")
    );

    const matched = parentLine?.match(/\[(.*)\]/);
    return matched ? matched[1] : null;
  }

  return null;
}
