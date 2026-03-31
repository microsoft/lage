import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { revertLocalChanges } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("revertLocalChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("reverts unstaged changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit a file
    fs.writeFileSync(path.join(cwd, "file.ts"), "original content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Modify the file (unstaged change to tracked file)
    fs.writeFileSync(path.join(cwd, "file.ts"), "modified content");

    // Revert changes
    const result = revertLocalChanges({ cwd });
    expect(result).toBe(true);

    // Verify file is back to original
    const content = fs.readFileSync(path.join(cwd, "file.ts"), "utf-8");
    expect(content).toBe("original content");
  });

  it("reverts staged changes", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and commit a file
    fs.writeFileSync(path.join(cwd, "file.ts"), "original");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Modify and stage
    fs.writeFileSync(path.join(cwd, "file.ts"), "modified");
    git(["add", "file.ts"], { cwd });

    // Revert changes
    const result = revertLocalChanges({ cwd });
    expect(result).toBe(true);

    // Verify file is back to original
    const content = fs.readFileSync(path.join(cwd, "file.ts"), "utf-8");
    expect(content).toBe("original");

    // Verify nothing is staged
    const staged = git(["diff", "--cached", "--name-only"], { cwd }).stdout.trim();
    expect(staged).toBe("");
  });

  it("reverts untracked files", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "existing.ts"), "content");
    git(["add", "existing.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Create untracked file
    const untrackedPath = path.join(cwd, "untracked.ts");
    fs.writeFileSync(untrackedPath, "new file");

    // Revert changes
    const result = revertLocalChanges({ cwd });
    expect(result).toBe(true);

    // Verify untracked file is removed
    expect(fs.existsSync(untrackedPath)).toBe(false);
  });

  // Unclear if this was the intended behavior when there's nothing to do, but keep it for now
  it("returns false when there are no changes to revert", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // No changes made
    const result = revertLocalChanges({ cwd });
    expect(result).toBe(false);
  });
});
