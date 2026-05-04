import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { git as _git, addGitObserver, clearGitObservers, type GitObserver, type GitOptions } from "../../git/git.js";
import { parseRemoteBranch } from "../../git/parseRemoteBranch.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("parseRemoteBranch", () => {
  const gitObserver = jest.fn<GitObserver>();

  beforeAll(() => {
    addGitObserver(gitObserver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    cleanupFixtures();
    clearGitObservers();
  });

  describe("deprecated version", () => {
    it("parses simple remote/branch", () => {
      expect(parseRemoteBranch("origin/main")).toEqual({ remote: "origin", remoteBranch: "main" });
      expect(parseRemoteBranch("origin/feature/foo")).toEqual({ remote: "origin", remoteBranch: "feature/foo" });
      expect(gitObserver).not.toHaveBeenCalled();
    });

    it("returns empty remote for branch without slash", () => {
      expect(parseRemoteBranch("main")).toEqual({ remote: "", remoteBranch: "main" });
      expect(gitObserver).not.toHaveBeenCalled();
    });

    it("incorrectly assumes first part is remote even if not known", () => {
      expect(parseRemoteBranch("feature/foo")).toEqual({ remote: "feature", remoteBranch: "foo" });
      expect(gitObserver).not.toHaveBeenCalled();
    });
  });

  // Now the tests for the new version

  it("parses branch with default known remote as prefix", () => {
    // behavior is currently the same with and without throwOnError here
    expect(parseRemoteBranch({ branch: "origin/main", cwd: "fake", throwOnError: true })).toEqual({
      remote: "origin",
      remoteBranch: "main",
    });
    expect(parseRemoteBranch({ branch: "origin/feature/foo", cwd: "fake", throwOnError: true })).toEqual({
      remote: "origin",
      remoteBranch: "feature/foo",
    });
    expect(parseRemoteBranch({ branch: "upstream/develop", cwd: "fake", throwOnError: true })).toEqual({
      remote: "upstream",
      remoteBranch: "develop",
    });
    expect(gitObserver).not.toHaveBeenCalled();
  });

  it("returns empty remote for branch without slash", () => {
    expect(parseRemoteBranch({ branch: "main", cwd: "fake", throwOnError: true })).toEqual({
      remote: "",
      remoteBranch: "main",
    });
    expect(gitObserver).not.toHaveBeenCalled();
  });

  it("uses custom knownRemotes", () => {
    const result = parseRemoteBranch({
      branch: "extra/feature/foo",
      knownRemotes: ["extra"],
      cwd: "fake",
      throwOnError: true,
    });
    expect(result).toEqual({
      remote: "extra",
      remoteBranch: "feature/foo",
    });
    expect(gitObserver).not.toHaveBeenCalled();
  });

  it("verifies against actual remotes if no knownRemotes match", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Add remotes
    git(["remote", "add", "origin", "https://example.com/origin.git"], { cwd });
    git(["remote", "add", "myremote", "https://example.com/repo.git"], { cwd });
    gitObserver.mockClear();

    // Should recognize the actual remote
    const result = parseRemoteBranch({ branch: "myremote/feature", cwd, throwOnError: true });
    expect(result).toEqual({
      remote: "myremote",
      remoteBranch: "feature",
    });
    expect(gitObserver).toHaveBeenCalledTimes(1);
  });

  it("returns empty remote for unknown remote prefix", () => {
    const cwd = setupFixture(undefined, { git: true });
    git(["remote", "add", "origin", "https://github.com/microsoft/lage.git"], { cwd });
    gitObserver.mockClear();

    const result = parseRemoteBranch({ branch: "unknown/feature", cwd });
    expect(result).toEqual({
      remote: "",
      remoteBranch: "unknown/feature",
    });
    expect(gitObserver).toHaveBeenCalledTimes(1);

    // currently doesn't throw with throwOnError: true
    const result2 = parseRemoteBranch({ branch: "unknown/feature", cwd, throwOnError: true });
    expect(result2).toEqual({
      remote: "",
      remoteBranch: "unknown/feature",
    });
  });

  it("throws if no defaults match and no remotes configured with throwOnError: true", () => {
    const cwd = setupFixture(undefined, { git: true });

    expect(() => parseRemoteBranch({ branch: "unknown/feature", cwd, throwOnError: true })).toThrow(
      `No remotes defined in git repo at ${cwd}`
    );
    expect(gitObserver).toHaveBeenCalledTimes(1);
  });

  it("returns matching remote when branch prefix matches a remote", () => {
    const cwd = setupFixture(undefined, { git: true });

    git(["remote", "add", "origin", "https://github.com/microsoft/lage.git"], { cwd });
    git(["remote", "add", "myremote", "https://github.com/ecraig12345/lage.git"], { cwd });
    gitObserver.mockClear();

    const result = parseRemoteBranch({ branch: "myremote/feature", cwd, throwOnError: true });
    expect(result).toEqual({
      remote: "myremote",
      remoteBranch: "feature",
    });
    expect(gitObserver).toHaveBeenCalledTimes(1);
  });
});
