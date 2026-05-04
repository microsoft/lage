import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { listAllTrackedFiles } from "../../git/listAllTrackedFiles.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("listAllTrackedFiles", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("throws on error when not a git repository", () => {
    const cwd = setupFixture();

    expect(() => listAllTrackedFiles({ patterns: [], cwd })).toThrow();
  });

  it("lists all tracked files", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and track files
    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    fs.mkdirSync(path.join(cwd, "subdir"));
    fs.writeFileSync(path.join(cwd, "subdir/file2.ts"), "content2");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "add files"], { cwd });

    // Create and stage file
    fs.writeFileSync(path.join(cwd, "staged.ts"), "staged");
    git(["add", "staged.ts"], { cwd });

    // Create untracked file
    fs.writeFileSync(path.join(cwd, "untracked.ts"), "untracked");

    const result = listAllTrackedFiles({ patterns: [], cwd }).sort();
    expect(result).toEqual(["file1.ts", "readme.md", "staged.ts", "subdir/file2.ts"]);
  });

  it("filters by pattern", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and track files
    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    fs.writeFileSync(path.join(cwd, "file2.js"), "content2");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "add files"], { cwd });

    const result = listAllTrackedFiles({ patterns: ["*.ts"], cwd });
    expect(result).toEqual(["file1.ts"]);
  });

  it("supports multiple patterns", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create directory structure
    fs.mkdirSync(path.join(cwd, "src"));
    fs.mkdirSync(path.join(cwd, "tests"));
    fs.writeFileSync(path.join(cwd, "src/index.ts"), "code");
    fs.writeFileSync(path.join(cwd, "tests/test.ts"), "tests");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");
    git(["add", "-A"], { cwd });
    git(["commit", "-m", "add files"], { cwd });

    const result = listAllTrackedFiles({ patterns: ["src/*", "tests/*"], cwd }).sort();
    expect(result).toEqual(["src/index.ts", "tests/test.ts"]);
  });

  it("does not include untracked files", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and track one file
    fs.writeFileSync(path.join(cwd, "tracked.ts"), "tracked");
    git(["add", "tracked.ts"], { cwd });
    git(["commit", "-m", "add tracked"], { cwd });

    // Create untracked file
    fs.writeFileSync(path.join(cwd, "untracked.ts"), "untracked");

    const result = listAllTrackedFiles({ patterns: [], cwd });
    expect(result).toEqual(["tracked.ts"]);
  });
});
