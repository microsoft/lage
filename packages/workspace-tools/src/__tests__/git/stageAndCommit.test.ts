//
// This tests stage(), commit(), and stageAndCommit() together.
//
import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { git as _git, type GitOptions } from "../../git/git.js";
import { commit, stage, stageAndCommit } from "../../git/gitUtilities.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

afterAll(() => {
  cleanupFixtures();
});

describe("stage", () => {
  it("stages files matching patterns", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create new files
    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    fs.writeFileSync(path.join(cwd, "file2.ts"), "content2");

    // Stage using patterns
    stage({ patterns: ["file1.ts", "file2.ts"], cwd });

    // Verify files are staged
    const staged = git(["diff", "--cached", "--name-only"], { cwd }).stdout.trim().split("\n").sort();
    expect(staged).toEqual(["file1.ts", "file2.ts"]);
  });

  it("stages using glob patterns", () => {
    const cwd = setupFixture(undefined, { git: true });

    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    fs.writeFileSync(path.join(cwd, "file2.ts"), "content2");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");

    // Stage only TypeScript files
    stage({ patterns: ["*.ts"], cwd });

    const staged = git(["diff", "--cached", "--name-only"], { cwd }).stdout.trim().split("\n").sort();
    expect(staged).toEqual(["file1.ts", "file2.ts"]);
  });
});

describe("commit", () => {
  it("creates a commit with message", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create and stage a file
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });

    // Commit
    commit({ message: "test commit", cwd });

    // Verify commit was created
    const log = git(["log", "--oneline"], { cwd }).stdout;
    expect(log).toContain("test commit");
  });

  it("supports commit options", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Modify and stage
    fs.writeFileSync(path.join(cwd, "file.ts"), "modified");
    git(["add", "file.ts"], { cwd });

    // Commit with --amend
    commit({ message: "amended commit", options: ["--amend"], cwd });

    // Verify only one commit exists
    const log = git(["log", "--oneline"], { cwd }).stdout.trim().split("\n");
    expect(log).toHaveLength(1);
    expect(log[0]).toContain("amended commit");
  });

  it("throws on empty commit attempt (without --allow-empty)", () => {
    const cwd = setupFixture(undefined, { git: true });

    // Create initial commit
    fs.writeFileSync(path.join(cwd, "file.ts"), "content");
    git(["add", "file.ts"], { cwd });
    git(["commit", "-m", "initial"], { cwd });

    // Try to commit with nothing staged
    expect(() => commit({ message: "empty commit", cwd })).toThrow("Committing changes failed");
  });
});

describe("stageAndCommit", () => {
  it("stages and commits files with patterns and options", () => {
    const cwd = setupFixture(undefined, { git: true });

    fs.writeFileSync(path.join(cwd, "file1.ts"), "content1");
    fs.writeFileSync(path.join(cwd, "file2.ts"), "content2");
    fs.writeFileSync(path.join(cwd, "readme.md"), "docs");

    // Stage and commit with --amend
    stageAndCommit({
      patterns: ["*.ts"],
      message: "amended",
      options: ["--amend"],
      cwd,
    });

    // Verify only one commit exists
    const log = git(["log", "--oneline"], { cwd }).stdout.trim().split("\n");
    expect(log).toHaveLength(1);
    expect(log[0]).toContain("amended");
  });
});
