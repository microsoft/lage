import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getRecentCommitMessages } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getRecentCommitMessages", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("returns empty array by default if branch doesn't exist", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Branch doesn't exist - returns empty array by default
    const result = getRecentCommitMessages({ branch: "nonexistent", cwd });
    expect(result).toEqual([]);
  });

  it("throws if branch doesn't exist and throwOnError is true", () => {
    const cwd = setupFixture(undefined, { git: true });

    expect(() => getRecentCommitMessages({ branch: "nonexistent", cwd, throwOnError: true })).toThrow(
      'Getting recent commit messages for branch "nonexistent" failed'
    );
  });

  it("returns commit messages between branch and HEAD", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit on main
    fs.writeFileSync(path.join(cwd, "file1.ts"), "initial");
    git(["add", "file1.ts"], { cwd });
    git(["commit", "-m", "initial commit"], { cwd });
    // Create a branch
    git(["checkout", "-b", "feature"], { cwd });

    // Make commits on feature branch
    fs.writeFileSync(path.join(cwd, "file2.ts"), "feature 1");
    git(["add", "file2.ts"], { cwd });
    git(["commit", "-m", "add feature 1"], { cwd });

    fs.writeFileSync(path.join(cwd, "file3.ts"), "feature 2");
    git(["add", "file3.ts"], { cwd });
    git(["commit", "-m", "add feature 2"], { cwd });

    // Get commits between main and HEAD
    const result = getRecentCommitMessages({ branch: "main", cwd });
    expect(result).toEqual(["add feature 2", "add feature 1"]);
  });

  it("returns empty array when no new commits", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit and switch branches
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });
    git(["checkout", "-b", "feature"], { cwd });

    // No new commits since main
    const result = getRecentCommitMessages({ branch: "main", cwd });
    expect(result).toEqual([]);
  });

  it("handles multi-line commit messages", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file1.ts"), "initial");
    git(["add", "file1.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Create branch and commit with multi-line message
    git(["checkout", "-b", "feature"], { cwd });
    fs.writeFileSync(path.join(cwd, "file2.ts"), "feature");
    git(["add", "file2.ts"], { cwd });
    git(["commit", "-m", "feat: add feature\n\nThis is a detailed description"], { cwd });

    const result = getRecentCommitMessages({ branch: "main", cwd });

    // Only returns the subject line
    expect(result).toEqual(["feat: add feature"]);
  });
});
