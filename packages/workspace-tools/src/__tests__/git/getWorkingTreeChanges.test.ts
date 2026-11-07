import { afterAll, afterEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import { addGitObserver, git, type GitObserver } from "../../git/git.js";
import { getWorkingTreeChanges } from "../../git/getChanges.js";

describe("getWorkingTreeChanges", () => {
  let stopObserving: (() => void) | undefined;

  afterEach(() => {
    stopObserving?.();
    stopObserving = undefined;
  });

  afterAll(() => {
    cleanupFixtures();
  });

  it("returns an empty array for a clean working tree", () => {
    const cwd = setupFixture(undefined, { git: true });

    expect(getWorkingTreeChanges({ cwd })).toEqual([]);
  });

  it("throws on failure by default", () => {
    const cwd = setupFixture();

    expect(() => getWorkingTreeChanges({ cwd })).toThrow("Gathering information about working tree changes failed");
  });

  it("returns an empty array on failure when throwOnError is false", () => {
    const cwd = setupFixture();

    expect(getWorkingTreeChanges({ cwd, throwOnError: false })).toEqual([]);
  });

  it("collects all working tree changes with one git call", () => {
    const cwd = setupFixture(undefined, { git: true });
    for (const file of ["staged.ts", "unstaged.ts", "both.ts", "deleted.ts", "staged-deleted.ts"]) {
      fs.writeFileSync(path.join(cwd, file), "original");
    }
    git(["add", "-A"], { cwd, throwOnError: true });
    git(["commit", "-m", "add files"], { cwd, throwOnError: true });

    fs.writeFileSync(path.join(cwd, "staged.ts"), "staged");
    fs.writeFileSync(path.join(cwd, "both.ts"), "staged");
    git(["add", "staged.ts", "both.ts"], { cwd, throwOnError: true });
    git(["rm", "staged-deleted.ts"], { cwd, throwOnError: true });
    fs.writeFileSync(path.join(cwd, "both.ts"), "unstaged");
    fs.writeFileSync(path.join(cwd, "unstaged.ts"), "unstaged");
    fs.rmSync(path.join(cwd, "deleted.ts"));
    fs.mkdirSync(path.join(cwd, "untracked"));
    fs.writeFileSync(path.join(cwd, "untracked/new.ts"), "untracked");

    const calls: string[][] = [];
    const observer: GitObserver = (args) => calls.push(args);
    stopObserving = addGitObserver(observer);
    expect(getWorkingTreeChanges({ cwd }).sort()).toEqual([
      "both.ts",
      "deleted.ts",
      "staged-deleted.ts",
      "staged.ts",
      "unstaged.ts",
      "untracked/new.ts",
    ]);
    expect(calls).toEqual([["status", "--porcelain=v1", "-z", "--untracked-files=all"]]);
  });

  it("preserves spaces and non-ASCII characters in paths", () => {
    const cwd = setupFixture(undefined, { git: true });
    const files = [" leading space.ts", "file with spaces.ts", "\u00e9.ts"];
    for (const file of files) {
      fs.writeFileSync(path.join(cwd, file), "untracked");
    }

    expect(getWorkingTreeChanges({ cwd }).sort()).toEqual(files);
  });

  it("excludes ignored and node_modules files", () => {
    const cwd = setupFixture(undefined, { git: true });
    fs.writeFileSync(path.join(cwd, ".gitignore"), "ignored.ts\n");
    git(["add", ".gitignore"], { cwd, throwOnError: true });
    git(["commit", "-m", "ignore file"], { cwd, throwOnError: true });
    fs.writeFileSync(path.join(cwd, "ignored.ts"), "ignored");
    fs.mkdirSync(path.join(cwd, "node_modules"));
    fs.writeFileSync(path.join(cwd, "node_modules/dependency.ts"), "excluded");
    fs.writeFileSync(path.join(cwd, "included.ts"), "included");

    expect(getWorkingTreeChanges({ cwd })).toEqual(["included.ts"]);
  });

  it("reports a staged change reversed in the working tree", () => {
    const cwd = setupFixture(undefined, { git: true });
    fs.writeFileSync(path.join(cwd, "file.ts"), "original");
    git(["add", "file.ts"], { cwd, throwOnError: true });
    git(["commit", "-m", "add file"], { cwd, throwOnError: true });
    fs.writeFileSync(path.join(cwd, "file.ts"), "staged");
    git(["add", "file.ts"], { cwd, throwOnError: true });
    fs.writeFileSync(path.join(cwd, "file.ts"), "original");

    expect(getWorkingTreeChanges({ cwd })).toEqual(["file.ts"]);
  });

  it("reports rename destinations without treating sources as status records", () => {
    const cwd = setupFixture(undefined, { git: true });
    fs.writeFileSync(path.join(cwd, "original.ts"), "original");
    git(["add", "original.ts"], { cwd, throwOnError: true });
    git(["commit", "-m", "add file"], { cwd, throwOnError: true });
    git(["config", "status.renames", "true"], { cwd, throwOnError: true });
    git(["mv", "original.ts", "renamed.ts"], { cwd, throwOnError: true });
    fs.writeFileSync(path.join(cwd, "untracked.ts"), "untracked");

    expect(getWorkingTreeChanges({ cwd }).sort()).toEqual(["renamed.ts", "untracked.ts"]);
  });
});
