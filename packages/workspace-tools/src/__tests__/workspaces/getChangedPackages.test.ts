import { afterAll, describe, expect, it } from "@jest/globals";
import path from "path";
import fs from "fs";
import { cleanupFixtures, setupFixture, setupLocalRemote } from "../setupFixture.js";
import { stageAndCommit, git as _git, type GitOptions } from "../../git/index.js";
import { getChangedPackages, getChangedPackagesBetweenRefs } from "../../workspaces/getChangedPackages.js";

/** Call git helper but throw on error by default */
const git = (args: string[], opts: GitOptions) => _git(args, { throwOnError: true, ...opts });

describe("getChangedPackages", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it("can detect changes inside an untracked file", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside an untracked file in a nested monorepo", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("returns all packages by default when a root level monorepo file is changed", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    fs.writeFileSync(path.join(root, "lage.config.json"), "hello foo test");

    expect(getChangedPackages({ cwd: root, target: "main" }).sort()).toEqual(["individual", "package-a", "package-b"]);
  });

  it("returns nothing when a root level monorepo file is changed and returnAllPackagesOnNoMatch is false", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    fs.writeFileSync(path.join(root, "lage.config.json"), "hello foo test");

    expect(getChangedPackages({ cwd: root, target: "main", returnAllPackagesOnNoMatch: false })).toEqual([]);
  });

  it("can detect changes when multiple files are changed", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const readmeFile = path.join(root, "README.md");
    const lageFile = path.join(root, "lage.config.json");
    fs.writeFileSync(readmeFile, "hello foo test");
    fs.writeFileSync(lageFile, "hello foo test");

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a", "package-b"]);
  });

  it("can ignore changes", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const readmeFile = path.join(root, "README.md");
    const lageFile = path.join(root, "lage.config.json");
    fs.writeFileSync(readmeFile, "hello foo test");
    fs.writeFileSync(lageFile, "hello foo test");

    const ignoreGlobs = ["lage.config.json", "README.md"];

    const changedPkgs = getChangedPackages({ cwd: root, target: "main", ignoreGlobs });

    expect(changedPkgs).toEqual([]);
  });

  it("can detect changes inside an unstaged file", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    const newFile = path.join(root, "packages/package-a/index.ts");
    fs.writeFileSync(newFile, "hello foo test");

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside an unstaged file in a nested monorepo", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const newFile = path.join(root, "packages/package-a/index.ts");
    fs.writeFileSync(newFile, "hello foo test");

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside a staged file", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["add", newFile], { cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside a staged file in a nested monorepo", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["add", newFile], { cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside a file that has been committed in a different branch", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["checkout", "-b", "newbranch"], { cwd: root });
    stageAndCommit({ patterns: [newFile], message: "test commit", cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside a file that has been committed in a different branch in a nested monorepo", () => {
    const root = path.join(setupFixture("monorepo-nested", { git: true }), "monorepo");

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["checkout", "-b", "newbranch"], { cwd: root });
    stageAndCommit({ patterns: [newFile], message: "test commit", cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root, target: "main" });

    expect(changedPkgs).toEqual(["package-a"]);
  });

  it("can detect changes inside a file that has been committed in a different branch using default remote", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });
    setupLocalRemote({ cwd: root, remoteName: "origin", fixtureName: "basic-yarn-1" });

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["checkout", "-b", "newbranch"], { cwd: root });
    stageAndCommit({ patterns: [newFile], message: "test commit", cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root });

    expect(changedPkgs).toContain("package-a");
  });

  it("can ignore glob patterns in detecting changes", () => {
    const root = setupFixture("monorepo-basic-yarn-1", { git: true });

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");
    git(["add", newFile], { cwd: root });

    const changedPkgs = getChangedPackages({ cwd: root, target: "main", ignoreGlobs: ["packages/package-a/*"] });

    expect(changedPkgs).toEqual([]);
  });

  describe("getChangedPackagesBetweenRefs", () => {
    it("returns all packages as changed if a top level file changes", () => {
      const root = setupFixture("monorepo-basic-yarn-1", { git: true });

      fs.writeFileSync(path.join(root, "footest.txt"), "hello foo test");
      stageAndCommit({ patterns: ["."], message: "test commit", cwd: root });

      const changedPkgs = getChangedPackagesBetweenRefs({ cwd: root, fromRef: "HEAD^1", toRef: "HEAD" });

      expect(changedPkgs.sort()).toEqual(["individual", "package-a", "package-b"]);
    });

    it("can detect changed packages between two refs", () => {
      const root = setupFixture("monorepo-basic-yarn-1", { git: true });

      const newFile = path.join(root, "packages/package-a/footest.txt");
      fs.writeFileSync(newFile, "hello foo test");
      git(["add", newFile], { cwd: root });
      stageAndCommit({ patterns: ["packages/package-a/footest.txt"], message: "test commit in a", cwd: root });

      const newFile2 = path.join(root, "packages/package-b/footest2.txt");
      fs.writeFileSync(newFile2, "hello foo test");
      git(["add", newFile2], { cwd: root });
      stageAndCommit({ patterns: ["packages/package-b/footest2.txt"], message: "test commit in b", cwd: root });

      const changedPkgs = getChangedPackagesBetweenRefs({ cwd: root, fromRef: "HEAD^1", toRef: "HEAD" });

      expect(changedPkgs).toEqual(["package-b"]);
    });
  });
});
