/** Options used for all git operations and wrappers */
export type GitCommonOptions = {
  cwd: string;
  /** If true, throw if the command fails */
  throwOnError?: boolean;
};

/** Options for git operations related to a branch */
export type GitBranchOptions = { branch: string } & GitCommonOptions;

export type GitFetchOptions = GitCommonOptions & {
  /** Remote name to fetch, e.g. "origin" (if not provided, fetches all remotes) */
  remote?: string;
  /** Branch name to fetch, e.g. "main". To use this, `remote` must also be set. */
  remoteBranch?: string;
  /** Extra command line options */
  options?: string[];
};

export type GetChangesBetweenRefsOptions = GitCommonOptions & {
  /** The starting reference */
  fromRef: string;
  /** The ending reference */
  toRef?: string;
  /** Extra command line options */
  options?: string[];
  /** Optional file pattern to filter results */
  pattern?: string;
};

export type GitInitOptions = Omit<GitCommonOptions, "throwOnError"> & {
  /** Email to set in the git config, if not already set */
  email?: string;
  /** Username to set in the git config, if not already set */
  username?: string;
};

export type ParseRemoteBranchOptions = GitCommonOptions & {
  /** Branch name with possible remote prefix */
  branch: string;
  /**
   * Well-known remote names. If these appear at the beginning of a branch name, they'll always
   * be returned as `ParsedRemoteBranch.remote` regardless of whether they exist locally.
   * @default ["origin", "upstream"]
   */
  knownRemotes?: string[];
};

export type ParsedRemoteBranch = {
  /**
   * Remote name, e.g. `origin`.
   * May be an empty string if the original branch reference didn't include a remote.
   */
  remote: string;
  /** Branch name without remote, e.g. `main`. This is always set. */
  remoteBranch: string;
};

export type GitStageOptions = {
  /** File patterns to stage */
  patterns: string[];
} & GitCommonOptions;

export type GitCommitOptions = GitCommonOptions & {
  /** Commit message */
  message: string;
  /** Additional git commit options */
  options?: string[];
};
