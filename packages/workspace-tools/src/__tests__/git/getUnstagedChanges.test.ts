import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getUnstagedChanges } from "../../git/getChanges.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getUnstagedChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("throws on error, e.g. not a git repository", () => {
    const cwd = setupFixture();

    expect(() => getUnstagedChanges({ cwd })).toThrow("Gathering information about unstaged changes failed");
  });

  it("returns unstaged file changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit files
    fs.writeFileSync(path.join(cwd, "file1.ts"), "original content");
    fs.mkdirSync(path.join(cwd, "dir"));
    fs.writeFileSync(path.join(cwd, "dir/file2.ts"), "original content");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Modify the files (unstaged change)
    fs.writeFileSync(path.join(cwd, "file1.ts"), "modified content");
    fs.writeFileSync(path.join(cwd, "dir/file2.ts"), "modified content");
    // Does not include an untracked file
    fs.writeFileSync(path.join(cwd, "untracked.ts"), "new content");

    const result = getUnstagedChanges({ cwd }).sort();
    expect(result).toEqual(["dir/file2.ts", "file1.ts"]);
  });

  it("does not include staged changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit files
    fs.writeFileSync(path.join(cwd, "staged.ts"), "original");
    fs.writeFileSync(path.join(cwd, "unstaged.ts"), "original");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Modify both
    fs.writeFileSync(path.join(cwd, "staged.ts"), "modified");
    fs.writeFileSync(path.join(cwd, "unstaged.ts"), "modified");

    // Stage one
    git(["add", "staged.ts"], { cwd });

    const result = getUnstagedChanges({ cwd });
    expect(result).toEqual(["unstaged.ts"]);
  });

  it("returns empty array when no unstaged changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit a file
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });
    // Add an untracked file
    fs.writeFileSync(path.join(cwd, "untracked.ts"), "content");

    const result = getUnstagedChanges({ cwd });
    expect(result).toEqual([]);
  });
});
