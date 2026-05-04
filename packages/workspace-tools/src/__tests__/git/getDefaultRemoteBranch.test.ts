import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import { cleanupFixtures, setupFixture, setupLocalRemote, setupPackageJson } from "../setupFixture.js";
import { addGitObserver, clearGitObservers, gitFailFast, type GitObserver } from "../../git/git.js";
import {
  getDefaultRemoteBranch,
  resolveRemoteBranch,
  type GetDefaultRemoteBranchOptions,
} from "../../git/getDefaultRemoteBranch.js";
import { findGitRoot } from "../../paths.js";

let cwd: string;
let consoleMock: jest.SpiedFunction<typeof console.log>;
const gitObserver = jest.fn<GitObserver>();

function gitRemote(...args: string[]) {
  gitFailFast(["remote", ...args], { cwd, noExitCode: true });
}

function getGitCalls() {
  return gitObserver.mock.calls.map(([args]) => args.join(" "));
}

const gitGetRemotesConfig = "config --local --get-regexp remote\\..*\\.url";
const gitGetOriginDefaultBranch = "ls-remote --symref origin HEAD";
const gitGetFooDefaultBranch = "ls-remote --symref foo HEAD";
const gitGetRoot = "rev-parse --show-toplevel";

beforeAll(() => {
  consoleMock = jest.spyOn(console, "log").mockImplementation(() => undefined);
  addGitObserver(gitObserver);
});

afterEach(() => {
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
  cleanupFixtures();
  clearGitObservers();
});

// These tests focus on the logic specific to getDefaultRemoteBranch, not the parts handled
// by getDefaultRemote.
describe("getDefaultRemoteBranch", () => {
  it("throws if not a git repo", () => {
    cwd = setupFixture();
    // sanity check: if this fails, there's a git repo in the OS temp dir
    expect(() => findGitRoot(cwd)).toThrow();

    // findGitRoot throws
    expect(() => getDefaultRemoteBranch({ cwd })).toThrow(`Directory "${cwd}" is not in a git repository`);
    // getRemotes throws
    expect(() => getDefaultRemoteBranch({ cwd, strict: true })).toThrow(`${cwd} is not in a git repository`);
  });

  // This case uses the result of getDefaultRemote, no extra logic
  it("with branch option, returns <defaultRemote>/<branch> without querying remote", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "origin", "https://github.com/microsoft/lage.git");
    gitObserver.mockClear();

    // Several tests use strict: true where the strict and permissive behavior should be the same
    expect(getDefaultRemoteBranch({ cwd, branch: "main", strict: true })).toBe("origin/main");

    expect(consoleMock).toHaveBeenCalledTimes(1);
    expect(consoleMock).toHaveBeenCalledWith(expect.stringContaining('Valid "repository" key not found'));

    // For each test, verify the specific git commands that were invoked.
    // This increases visibility into internal behavior of specific cases, as well as if
    // more operations are added later (to be sure it's not accidental).
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
  });

  it("with branch name that includes a slash, returns <defaultRemote>/<branch> without querying remote", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd, { repository: "https://github.com/microsoft/lage.git" });
    gitRemote("add", "origin", "https://github.com/example/lage.git");
    gitRemote("add", "upstream", "https://github.com/microsoft/lage.git");
    gitObserver.mockClear();

    expect(getDefaultRemoteBranch({ cwd, branch: "feature/foo", strict: true })).toBe("upstream/feature/foo");
    expect(consoleMock).not.toHaveBeenCalled(); // no warning since repository field is valid

    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("gets default branch from remote via ls-remote and handles errors", () => {
    // Change the default branch name to verify it's really used
    cwd = setupFixture(undefined, { git: true, defaultBranchName: "bar" });
    const remoteDir = setupLocalRemote({ cwd, remoteName: "foo", defaultBranchName: "bar" });
    gitObserver.mockClear();

    expect(getDefaultRemoteBranch({ cwd, strict: true })).toBe("foo/bar");

    // setupLocalRemote updates package.json so we don't get the warning
    expect(consoleMock).not.toHaveBeenCalled();
    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetFooDefaultBranch]);
    gitObserver.mockClear();
    consoleMock.mockClear();

    // Combine the error handling tests since this setup is expensive:
    // make ls-remote fail
    fs.rmdirSync(remoteDir, { recursive: true });
    // allowed in permissive mode
    expect(getDefaultRemoteBranch({ cwd })).toBe("foo/bar");
    // in strict mode, it throws if ls-remote fails
    expect(() => getDefaultRemoteBranch({ cwd, strict: true })).toThrow(
      // it should also include stderr from git, which we can't test directly
      `Fetching default branch info from remote "foo" failed\n`
    );
  });

  // No remotes configured: getDefaultRemote falls back to "origin",
  // ls-remote fails, and getDefaultBranch reads init.defaultBranch.
  it("falls back to init.defaultBranch when remote is unavailable (permissive)", () => {
    // Change the default branch name to verify it's really used
    cwd = setupFixture(undefined, { git: true, defaultBranchName: "foo" });
    setupPackageJson(cwd);
    gitObserver.mockClear();

    expect(getDefaultRemoteBranch({ cwd })).toBe("origin/foo");

    expect(getGitCalls()).toEqual([
      gitGetRemotesConfig,
      gitGetRoot,
      gitGetOriginDefaultBranch,
      "config init.defaultBranch",
    ]);
  });

  // The cases where it throws in strict mode are mostly the same as getDefaultRemote
  it("throws when remote is unavailable (strict)", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitObserver.mockClear();

    expect(() => getDefaultRemoteBranch({ cwd, strict: true })).toThrow(`No remotes defined in git repo at ${cwd}`);
  });
});

describe("resolveRemoteBranch", () => {
  it("returns branch as-is when it already has a known remote prefix (no git ops)", () => {
    const opts: GetDefaultRemoteBranchOptions = { cwd: "fake", strict: true };
    expect(resolveRemoteBranch({ branch: "origin/main", ...opts })).toBe("origin/main");
    expect(resolveRemoteBranch({ branch: "upstream/develop", ...opts })).toBe("upstream/develop");
    expect(resolveRemoteBranch({ branch: "origin/feature/foo", ...opts })).toBe("origin/feature/foo");
    expect(gitObserver).not.toHaveBeenCalled();
  });

  it("prepends default remote for plain branch with no slash", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "origin", "https://github.com/microsoft/lage.git");
    gitObserver.mockClear();

    expect(resolveRemoteBranch({ branch: "main", cwd, strict: true })).toBe("origin/main");

    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
  });

  it("recognizes a non-default remote prefix in branch name", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "origin", "https://github.com/microsoft/lage.git");
    gitRemote("add", "myremote", "https://github.com/myuser/lage.git");
    gitObserver.mockClear();

    expect(resolveRemoteBranch({ branch: "myremote/feature", cwd, strict: true })).toBe("myremote/feature");

    expect(getGitCalls()).toEqual([gitGetRemotesConfig]);
  });

  it("prepends default remote when slash-containing branch prefix is not a real remote", () => {
    cwd = setupFixture(undefined, { git: true });
    setupPackageJson(cwd);
    gitRemote("add", "origin", "https://github.com/microsoft/lage.git");
    gitObserver.mockClear();

    // "feature" is not a remote, so the whole string is treated as the branch name
    expect(resolveRemoteBranch({ branch: "feature/foo", cwd, strict: true })).toBe("origin/feature/foo");

    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetRoot]);
  });

  it("queries remote for default branch when no branch is given", () => {
    cwd = setupFixture(undefined, { git: true });
    setupLocalRemote({ cwd, remoteName: "origin" });
    jest.clearAllMocks();

    expect(resolveRemoteBranch({ branch: undefined, cwd, strict: true })).toBe("origin/main");

    expect(getGitCalls()).toEqual([gitGetRemotesConfig, gitGetOriginDefaultBranch]);
  });
});
