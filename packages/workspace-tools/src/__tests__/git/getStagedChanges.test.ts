import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getStagedChanges } from "../../git/getChanges.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getStagedChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("throws on error, e.g. not a git repository", () => {
    const cwd = setupFixture();

    expect(() => getStagedChanges({ cwd })).toThrow("Gathering information about staged changes failed");
  });

  it("returns staged file changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit initial files
    fs.writeFileSync(path.join(cwd, "feature.ts"), "original");
    git(["add", "feature.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });
    // Modify and stage, and add another file
    fs.writeFileSync(path.join(cwd, "feature.ts"), "modified");
    fs.mkdirSync(path.join(cwd, "stuff"));
    fs.writeFileSync(path.join(cwd, "stuff/new-file.ts"), "new content");
    git(["add", "feature.ts", "stuff/new-file.ts"], { cwd });

    const result = getStagedChanges({ cwd }).sort();
    expect(result).toEqual(["feature.ts", "stuff/new-file.ts"]);
  });

  it("does not include unstaged changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit files
    fs.writeFileSync(path.join(cwd, "staged.js"), "original");
    fs.writeFileSync(path.join(cwd, "unstaged.js"), "original");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Modify both and add another
    fs.writeFileSync(path.join(cwd, "staged.js"), "modified");
    fs.writeFileSync(path.join(cwd, "unstaged.js"), "modified");
    fs.writeFileSync(path.join(cwd, "another-file.js"), "new content");

    // Only stage one
    git(["add", "staged.js"], { cwd });

    const result = getStagedChanges({ cwd });
    expect(result).toEqual(["staged.js"]);
  });

  it("returns empty array when nothing is staged", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit a file
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });
    // Modify but don't stage
    fs.writeFileSync(path.join(cwd, "file.ts"), "modified");
    fs.writeFileSync(path.join(cwd, "another-file.ts"), "new content");

    const result = getStagedChanges({ cwd });

    expect(result).toEqual([]);
  });
});
