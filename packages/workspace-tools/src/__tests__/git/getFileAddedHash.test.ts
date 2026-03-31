import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getFileAddedHash } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getFileAddedHash", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("returns hash of commit where file was added", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create first commit
    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    git(["add", "file1.ts"], { cwd });
    git(["commit", "-m", "add file1"], { cwd });
    const firstHash = git(["rev-parse", "HEAD"], { cwd }).stdout.trim();

    // Create second commit with another file
    fs.writeFileSync(path.join(cwd, "file2.ts"), "content2");
    git(["add", "file2.ts"], { cwd });
    git(["commit", "-m", "add file2"], { cwd });

    // Get hash for file1
    const result = getFileAddedHash({ filename: "file1.ts", cwd });
    expect(result).toBe(firstHash);
  });

  it("returns undefined for non-existent file", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create a commit
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    const result = getFileAddedHash({ filename: "nonexistent.ts", cwd });
    expect(result).toBeUndefined();
  });
});
