export { getBranchName, getFullBranchRef, getRemoteBranch, getShortBranchName } from "./branchRefs.js";
export { getConfigValue, getDefaultBranch, getUserEmail } from "./config.js";
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
export { getDefaultRemote, type GetDefaultRemoteOptions } from "./getDefaultRemote.js";
export {
  getDefaultRemoteBranch,
  type GetDefaultRemoteBranchOptions,
  resolveRemoteBranch,
} from "./getDefaultRemoteBranch.js";
export { getFileAddedHash } from "./getFileAddedHash.js";
export { getFileFromRef } from "./getFileFromRef.js";
export { getRecentCommitMessages } from "./getRecentCommitMessages.js";
export {
  addGitObserver,
  clearGitObservers,
  git,
  gitFailFast,
  type GitError,
  type GitObserver,
  type GitOptions,
  type GitProcessOutput,
} from "./git.js";
export { getParentBranch } from "./gitUtilities.js";
export { init } from "./init.js";
export { listAllTrackedFiles } from "./listAllTrackedFiles.js";
export { parseRemoteBranch } from "./parseRemoteBranch.js";
export { revertLocalChanges } from "./revertLocalChanges.js";
export { commit, stage, stageAndCommit } from "./stageAndCommit.js";

// getRepositoryName is not currently exported; could be changed if it would be useful externally
