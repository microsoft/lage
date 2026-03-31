//
// These tests cover ref-related helpers.
//
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture, setupLocalRemote } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import {
  getBranchName,
  getCurrentHash,
  getFullBranchRef,
  getRemoteBranch,
  getShortBranchName,
} from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

afterAll(() => {
  cleanupFixtures();
});

describe("getBranchName", () => {
  it("returns null if no git repo", () => {
    const cwd = setupFixture();

    const result = getBranchName({ cwd });
    expect(result).toBeNull();
  });

  it("returns current default branch name", () => {
    const cwd = setupFixture(undefined, { git: true });

    const result = getBranchName({ cwd });
    // setupFixture ensures main is used for tests
    expect(result).toBe("main");
  });

  it("returns custom branch name", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Switch to a new branch
    git(["checkout", "-b", "feature-branch"], { cwd, throwOnError: true });

    const result = getBranchName({ cwd });
    expect(result).toBe("feature-branch");
  });

  it("returns HEAD when in detached HEAD state", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Detach HEAD
    const hash = git(["rev-parse", "HEAD"], { cwd }).stdout.trim();
    git(["checkout", hash], { cwd });

    const result = getBranchName({ cwd });
    expect(result).toBe("HEAD");
  });
});

describe("getCurrentHash", () => {
  it("returns current commit hash", () => {
    const cwd = setupFixture(undefined, { git: true });

    const result = getCurrentHash({ cwd });

    // Should be a valid git hash (40 character hex string)
    expect(result).toMatch(/^[0-9a-f]{40}$/);
  });

  it("returns different hashes for different commits", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create first commit
    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    git(["add", "file1.ts"], { cwd });
    git(["commit", "-m", "commit1"], { cwd });
    const hash1 = getCurrentHash({ cwd });

    // Create second commit
    fs.writeFileSync(path.join(cwd, "file2.ts"), "content2");
    git(["add", "file2.ts"], { cwd });
    git(["commit", "-m", "commit2"], { cwd });
    const hash2 = getCurrentHash({ cwd });

    expect(hash1).not.toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{40}$/);
    expect(hash2).toMatch(/^[0-9a-f]{40}$/);
  });
});

describe("getFullBranchRef", () => {
  it("returns full reference for a branch", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create a new branch
    git(["branch", "feature"], { cwd });

    const result = getFullBranchRef({ branch: "feature", cwd });
    expect(result).toBe("refs/heads/feature");
  });

  it("returns null for non-existent branch", () => {
    const cwd = setupFixture(undefined, { git: true });

    const result = getFullBranchRef({ branch: "nonexistent", cwd });
    expect(result).toBeNull();
  });
});

describe("getRemoteBranch", () => {
  /** Shared fixture directory with a remote "foo", and "main" configured to track "foo/main" */
  let sharedCwd: string;
  const remoteName = "foo";

  beforeAll(() => {
    sharedCwd = setupFixture(undefined, { git: true });

    setupLocalRemote({ cwd: sharedCwd, remoteName });
    git(["branch", `--set-upstream-to=${remoteName}/main`, "main"], { cwd: sharedCwd });
  });

  it("returns null when there are no remotes", () => {
    // Use a fresh fixture without any remotes
    const cwd = setupFixture(undefined, { git: true });

    const result = getRemoteBranch({ branch: "main", cwd });
    expect(result).toBeNull();
  });

  it("returns null if there is no remote tracking branch", () => {
    git(["checkout", "-b", "local-only", "main"], { cwd: sharedCwd });

    const result = getRemoteBranch({ branch: "local-only", cwd: sharedCwd });
    expect(result).toBeNull();
  });

  it("returns null if branch doesn't exist", () => {
    const result = getRemoteBranch({ branch: "nonexistent-branch", cwd: sharedCwd });
    expect(result).toBeNull();
  });

  it("returns remote tracking branch of main", () => {
    const result = getRemoteBranch({ branch: "main", cwd: sharedCwd });
    expect(result).toBe(`${remoteName}/main`);
  });

  it("returns custom remote tracking branch", () => {
    git(["checkout", "-b", "custom-branch", "main"], { cwd: sharedCwd });
    // push with a different tracking branch name
    git(["push", "-u", remoteName, "custom-branch:custom-remote-branch"], { cwd: sharedCwd });

    const result = getRemoteBranch({ branch: "custom-branch", cwd: sharedCwd });
    expect(result).toBe(`${remoteName}/custom-remote-branch`);
  });
});

describe("getShortBranchName", () => {
  it("returns short name from full branch ref", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create a new branch with an empty commit (quickest way to get a unique SHA)
    git(["branch", "my-feature"], { cwd });
    git(["commit", "--allow-empty", "-m", "empty commit"], { cwd });

    const result = getShortBranchName({ fullBranchRef: "refs/heads/my-feature", cwd });
    expect(result).toBe("my-feature");
  });

  it("returns null for non-existent branch", () => {
    const cwd = setupFixture(undefined, { git: true });

    const result = getShortBranchName({ fullBranchRef: "refs/heads/nonexistent", cwd });
    expect(result).toBeNull();
  });

  it('returns branch name with remote for "refs/remotes/"', () => {
    const cwd = setupFixture(undefined, { git: true });

    // Set this branch to point to a remote branch
    setupLocalRemote({ cwd, remoteName: "origin" });
    git(["branch", "--set-upstream-to=origin/main", "main"], { cwd, throwOnError: true });

    const remoteResult = getShortBranchName({ fullBranchRef: "refs/remotes/origin/main", cwd });
    expect(remoteResult).toBe("origin/main");

    const localResult = getShortBranchName({ fullBranchRef: "refs/heads/main", cwd });
    expect(localResult).toBe("main");
  });
});
