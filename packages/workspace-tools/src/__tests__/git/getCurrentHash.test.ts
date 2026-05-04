import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getCurrentHash } from "../../git/getCurrentHash.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getCurrentHash", () => {
  afterAll(() => {
    cleanupFixtures();
  });

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
