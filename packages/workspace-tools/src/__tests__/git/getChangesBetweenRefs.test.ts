import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { getBranchChanges, getChangesBetweenRefs } from "../../git/getChanges.js";
import { getCurrentHash } from "../../git/getCurrentHash.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

afterAll(() => {
  cleanupFixtures();
});

describe("getChangesBetweenRefs", () => {
  it("throws on error, e.g. not a git repository", () => {
    const cwd = setupFixture();

    expect(() => getChangesBetweenRefs({ fromRef: "main", toRef: "foo", cwd })).toThrow(
      "Gathering information about changes between refs (main...foo) failed"
    );
  });

  it("returns changes between ref and HEAD", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file1.ts"), "initial");
    git(["add", "file1.ts"], { cwd });
    git(["commit", "-m", "commit1"], { cwd });
    const firstCommit = getCurrentHash({ cwd })!;

    // Make more changes
    fs.writeFileSync(path.join(cwd, "file2.ts"), "new file");
    fs.writeFileSync(path.join(cwd, "file3.ts"), "new file");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "commit2"], { cwd });

    // Get changes between commits
    const result = getChangesBetweenRefs({ fromRef: firstCommit, cwd }).sort();
    expect(result).toEqual(["file2.ts", "file3.ts"]);
  });

  it("returns changes between two different refs", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Commit a file on main
    fs.writeFileSync(path.join(cwd, "main-file.ts"), "main content");
    git(["add", "main-file.ts"], { cwd });
    git(["commit", "-m", "main commit"], { cwd });

    // Create a branch and check out some files
    git(["checkout", "-b", "feature1"], { cwd });
    fs.writeFileSync(path.join(cwd, "file1.ts"), "file1");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "commit1"], { cwd });

    // Create another branch off feature1
    git(["checkout", "-b", "feature2"], { cwd });
    fs.writeFileSync(path.join(cwd, "file2.ts"), "file2");
    fs.writeFileSync(path.join(cwd, "file3.ts"), "file3");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "commit2"], { cwd });

    // Check out main again
    git(["checkout", "main"], { cwd });

    // Get changes between feature1 and feature2
    const result = getChangesBetweenRefs({ fromRef: "feature1", toRef: "feature2", cwd }).sort();
    expect(result).toEqual(["file2.ts", "file3.ts"]);
  });

  it("supports pattern filtering", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file.ts"), "initial");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "commit1"], { cwd });

    // Make changes to different file types
    fs.writeFileSync(path.join(cwd, "code.ts"), "code");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "commit2"], { cwd });
    const secondCommit = getCurrentHash({ cwd })!;

    // Get only TypeScript file changes
    const result = getChangesBetweenRefs({
      fromRef: "HEAD~1",
      toRef: secondCommit,
      pattern: "*.ts",
      cwd,
    });

    expect(result).toEqual(["code.ts"]);
  });

  it("supports additional diff options", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file.ts"), "initial");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "commit1"], { cwd });

    // Change the file and add a new file
    fs.writeFileSync(path.join(cwd, "file.ts"), "modified");
    fs.writeFileSync(path.join(cwd, "newfile.ts"), "new file");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "commit2"], { cwd });

    // Should work with additional options
    const result = getChangesBetweenRefs({
      fromRef: "HEAD~1",
      options: ["--diff-filter=M"],
      cwd,
    });

    expect(result).toEqual(["file.ts"]);
  });
});

describe("getBranchChanges", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("passes correct args through to getChangesBetweenRefs", () => {
    const cwd = setupFixture();

    // This will fail since it's not a git repo.
    // Verify the throwOnError option is true by default.
    expect(() => getBranchChanges({ branch: "foo", cwd })).toThrow(
      // The message shows the ref was passed through
      "Gathering information about changes between refs (foo...) failed"
    );
  });
});
