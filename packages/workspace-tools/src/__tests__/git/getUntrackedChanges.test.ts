import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getUntrackedChanges } from "../../git/getChanges.js";
import type { GitCommonOptions } from "../../git/types.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getUntrackedChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("throws on error, e.g. not a git repository", () => {
    const cwd = setupFixture();

    expect(() => getUntrackedChanges({ cwd })).toThrow("Gathering information about untracked changes failed");
  });

  it("returns untracked files using object params", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create some untracked files
    fs.writeFileSync(path.join(cwd, "untracked1.txt"), "content1");
    fs.writeFileSync(path.join(cwd, "untracked2.js"), "content2");

    const result = getUntrackedChanges({ cwd }).sort();
    expect(result).toEqual(["untracked1.txt", "untracked2.js"]);
  });

  it("does not include tracked files", () => {
    const cwd = setupFixture(undefined, { git: true });
    const gitOptions: GitCommonOptions = { cwd, throwOnError: true };

    const committedFile = path.join(cwd, "committed.txt");
    fs.writeFileSync(committedFile, "committed content");
    git(["add", "committed.txt"], gitOptions);
    git(["commit", "-m", "add committed file"], gitOptions);

    // Create and stage a file
    const stagedFile = path.join(cwd, "staged.txt");
    fs.writeFileSync(stagedFile, "staged content");
    git(["add", "staged.txt"], gitOptions);

    // Create an untracked file
    fs.writeFileSync(path.join(cwd, "untracked.txt"), "untracked content");

    const result = getUntrackedChanges({ cwd });
    expect(result).toEqual(["untracked.txt"]);
  });

  it("returns empty array when no untracked files", () => {
    const cwd = setupFixture(undefined, { git: true });

    const result = getUntrackedChanges({ cwd });

    expect(result).toEqual([]);
  });

  it("respects gitignore patterns", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create .gitignore
    fs.writeFileSync(path.join(cwd, ".gitignore"), "*.log\n");

    // Create files
    fs.writeFileSync(path.join(cwd, "file.txt"), "content");
    fs.writeFileSync(path.join(cwd, "error.log"), "log content");

    const result = getUntrackedChanges({ cwd }).sort();
    expect(result).toEqual([".gitignore", "file.txt"]);
  });
});
