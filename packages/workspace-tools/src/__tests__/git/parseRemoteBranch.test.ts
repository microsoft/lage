import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { git as _git, type GitOptions } from "../../git/git.js";
import { parseRemoteBranch } from "../../git/parseRemoteBranch.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("parseRemoteBranch", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  describe("deprecated version", () => {
    it("parses simple remote/branch", () => {
      expect(parseRemoteBranch("origin/main")).toEqual({ remote: "origin", remoteBranch: "main" });
      expect(parseRemoteBranch("origin/feature/foo")).toEqual({ remote: "origin", remoteBranch: "feature/foo" });
    });

    it("returns empty remote for branch without slash", () => {
      expect(parseRemoteBranch("main")).toEqual({ remote: "", remoteBranch: "main" });
    });

    it("incorrectly assumes first part is remote even if not known", () => {
      expect(parseRemoteBranch("feature/foo")).toEqual({ remote: "feature", remoteBranch: "foo" });
    });
  });

  // Now the tests for the new version

  it("parses branch with default known remote as prefix", () => {
    expect(parseRemoteBranch({ branch: "origin/main", cwd: "fake" })).toEqual({
      remote: "origin",
      remoteBranch: "main",
    });
    expect(parseRemoteBranch({ branch: "origin/feature/foo", cwd: "fake" })).toEqual({
      remote: "origin",
      remoteBranch: "feature/foo",
    });
    expect(parseRemoteBranch({ branch: "upstream/develop", cwd: "fake" })).toEqual({
      remote: "upstream",
      remoteBranch: "develop",
    });
  });

  it("returns empty remote for branch without slash", () => {
    expect(parseRemoteBranch({ branch: "main", cwd: "fake" })).toEqual({
      remote: "",
      remoteBranch: "main",
    });
  });

  it("uses custom knownRemotes", () => {
    const result = parseRemoteBranch({
      branch: "extra/feature/foo",
      knownRemotes: ["extra"],
      cwd: "fake",
    });
    expect(result).toEqual({
      remote: "extra",
      remoteBranch: "feature/foo",
    });
  });

  it("verifies against actual remotes if no knownRemotes match", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Add remotes
    git(["remote", "add", "origin", "https://example.com/origin.git"], { cwd });
    git(["remote", "add", "myremote", "https://example.com/repo.git"], { cwd });

    // Should recognize the actual remote
    const result = parseRemoteBranch({ branch: "myremote/feature", cwd });
    expect(result).toEqual({
      remote: "myremote",
      remoteBranch: "feature",
    });
  });

  it("returns empty remote for unknown remote prefix", () => {
    const cwd = setupFixture(undefined, { git: true });

    // No remotes configured, so "unknown" is not a remote
    const result = parseRemoteBranch({ branch: "unknown/feature", cwd });
    expect(result).toEqual({
      remote: "",
      remoteBranch: "unknown/feature",
    });
  });
});
