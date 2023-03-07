import execa from "execa";

export interface IGitVersion {
  major: number;
  minor: number;
  patch: number;
}

const MINIMUM_GIT_VERSION: IGitVersion = {
  major: 2,
  minor: 20,
  patch: 0,
};

/**
 * Checks the git version and throws an error if it is less than the minimum required version.
 *
 * @public
 */
export function ensureGitMinimumVersion(gitPath?: string): void {
  const gitVersion: IGitVersion = getGitVersion(gitPath);
  if (
    gitVersion.major < MINIMUM_GIT_VERSION.major ||
    (gitVersion.major === MINIMUM_GIT_VERSION.major && gitVersion.minor < MINIMUM_GIT_VERSION.minor) ||
    (gitVersion.major === MINIMUM_GIT_VERSION.major &&
      gitVersion.minor === MINIMUM_GIT_VERSION.minor &&
      gitVersion.patch < MINIMUM_GIT_VERSION.patch)
  ) {
    throw new Error(
      `The minimum Git version required is ` +
        `${MINIMUM_GIT_VERSION.major}.${MINIMUM_GIT_VERSION.minor}.${MINIMUM_GIT_VERSION.patch}. ` +
        `Your version is ${gitVersion.major}.${gitVersion.minor}.${gitVersion.patch}.`
    );
  }
}

function getGitVersion(gitPath?: string): IGitVersion {
  const result = execa.sync(gitPath || "git", ["version"]);

  if (result.exitCode !== 0) {
    throw new Error(
      `While validating the Git installation, the "git version" command failed with ` + `status ${result.exitCode}: ${result.stderr}`
    );
  }

  return parseGitVersion(result.stdout);
}

export function parseGitVersion(gitVersionOutput: string): IGitVersion {
  // This regexp matches output of "git version" that looks like `git version <number>.<number>.<number>(+whatever)`
  // Examples:
  // - git version 1.2.3
  // - git version 1.2.3.4.5
  // - git version 1.2.3windows.1
  // - git version 1.2.3.windows.1
  const versionRegex = /^git version (\d+)\.(\d+)\.(\d+)/;
  const match: RegExpMatchArray | null = versionRegex.exec(gitVersionOutput);
  if (!match) {
    throw new Error(
      `While validating the Git installation, the "git version" command produced ` + `unexpected output: "${gitVersionOutput}"`
    );
  }

  const major: number = parseInt(match[1], 10);
  const minor: number = parseInt(match[2], 10);
  const patch: number = parseInt(match[3], 10);

  return {
    major,
    minor,
    patch,
  };
}
