import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getFileFromVersion } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getFileFromVersion", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("returns file content at a specific commit", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create a file and commit
    fs.writeFileSync(path.join(cwd, "test.txt"), "version 1");
    git(["add", "test.txt"], { cwd });
    git(["commit", "-m", "first commit"], { cwd });

    // Get the commit SHA
    const firstCommit = git(["rev-parse", "HEAD"], { cwd }).stdout.trim();

    // Modify the file and commit again
    fs.writeFileSync(path.join(cwd, "test.txt"), "version 2");
    git(["add", "test.txt"], { cwd });
    git(["commit", "-m", "second commit"], { cwd });

    // Should get the old version from the first commit
    const result = getFileFromVersion({ filePath: "test.txt", ref: firstCommit, cwd });
    expect(result).toBe("version 1");

    // Should get the new version from HEAD
    const resultHead = getFileFromVersion({ filePath: "test.txt", ref: "HEAD", cwd });
    expect(resultHead).toBe("version 2");
  });

  it("returns file content from a branch name", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create a file on main
    fs.writeFileSync(path.join(cwd, "file.txt"), "main content");
    git(["add", "file.txt"], { cwd });
    git(["commit", "-m", "add file on main"], { cwd });

    // Create a new branch and modify the file
    git(["checkout", "-b", "feature"], { cwd });
    fs.writeFileSync(path.join(cwd, "file.txt"), "feature content");
    git(["add", "file.txt"], { cwd });
    git(["commit", "-m", "modify file on feature"], { cwd });

    // Should get the main version using branch ref
    const result = getFileFromVersion({ filePath: "file.txt", ref: "main", cwd });
    expect(result).toBe("main content");

    // Should get the feature version using branch ref
    const resultFeature = getFileFromVersion({ filePath: "file.txt", ref: "feature", cwd });
    expect(resultFeature).toBe("feature content");
  });

  it("returns undefined if file does not exist at the given ref", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create an initial commit without the file
    fs.writeFileSync(path.join(cwd, "other.txt"), "other");
    git(["add", "other.txt"], { cwd });
    git(["commit", "-m", "initial commit"], { cwd });

    const firstCommit = _git(["rev-parse", "HEAD"], { cwd, throwOnError: true }).stdout.trim();

    // Add the target file in a later commit
    fs.writeFileSync(path.join(cwd, "test.txt"), "new file");
    git(["add", "test.txt"], { cwd });
    git(["commit", "-m", "add test.txt"], { cwd });

    // File doesn't exist at first commit
    const result = getFileFromVersion({ filePath: "test.txt", ref: firstCommit, cwd });
    expect(result).toBeUndefined();
  });

  it("returns undefined if ref is invalid", () => {
    const cwd = setupFixture(undefined, { git: true });

    fs.writeFileSync(path.join(cwd, "test.txt"), "content");
    git(["add", "test.txt"], { cwd });
    git(["commit", "-m", "commit"], { cwd });

    const result = getFileFromVersion({ filePath: "test.txt", ref: "nonexistent-ref", cwd });
    expect(result).toBeUndefined();
  });

  it("returns file content from a subdirectory path", () => {
    const cwd = setupFixture(undefined, { git: true });

    fs.mkdirSync(path.join(cwd, "subdir"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "subdir/nested.txt"), "nested content");
    git(["add", "."], { cwd });
    git(["commit", "-m", "add nested file"], { cwd });

    const result = getFileFromVersion({ filePath: "subdir/nested.txt", ref: "HEAD", cwd });
    expect(result).toBe("nested content");
  });
});
