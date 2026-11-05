import { afterAll, describe, expect, it } from "@jest/globals";
import { cleanupFixtures, setupFixture } from "../setupFixture.js";
import fs from "fs";
import path from "path";
import { getPackagesByFiles } from "../../workspaces/getPackagesByFiles.js";
import type { PackageInfos } from "../../types/PackageInfo.js";

describe("getPackagesByFiles", () => {
  afterAll(() => {
    cleanupFixtures();
  });

  it.each([
    { files: ["packages/a/file.txt"], ignoreGlobs: [], returnAllPackagesOnNoMatch: false, expected: ["a"] },
    { files: ["packages/a/nested/file.txt"], ignoreGlobs: [], returnAllPackagesOnNoMatch: false, expected: ["nested"] },
    { files: ["packages/a/file.txt"], ignoreGlobs: ["packages/a/**"], returnAllPackagesOnNoMatch: false, expected: [] },
    { files: ["package.json"], ignoreGlobs: [], returnAllPackagesOnNoMatch: true, expected: ["a", "nested"] },
    { files: [], ignoreGlobs: [], returnAllPackagesOnNoMatch: true, expected: [] },
  ])("uses preloaded package metadata for $files", ({ files, ignoreGlobs, returnAllPackagesOnNoMatch, expected }) => {
    const root = path.resolve("preloaded-workspace");
    const packageInfos: PackageInfos = {
      a: { name: "a", version: "1.0.0", packageJsonPath: path.join(root, "packages/a/package.json") },
      nested: { name: "nested", version: "1.0.0", packageJsonPath: path.join(root, "packages/a/nested/package.json") },
    };

    expect(getPackagesByFiles({ root, files, packageInfos, ignoreGlobs, returnAllPackagesOnNoMatch })).toEqual(
      expected
    );
  });

  it("can find all packages that contain the files in a monorepo", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const newFile = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFile, "hello foo test");

    const packages = getPackagesByFiles({ root, files: ["packages/package-a/footest.txt"] });

    expect(packages).toEqual(["package-a"]);
  });

  it("can find can ignore changes in a glob pattern", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const newFileA = path.join(root, "packages/package-a/footest.txt");
    fs.writeFileSync(newFileA, "hello foo test");

    const newFileB = path.join(root, "packages/package-b/footest.txt");
    fs.writeFileSync(newFileB, "hello foo test");

    const packages = getPackagesByFiles({
      root,
      files: ["packages/package-a/footest.txt", "packages/package-b/footest.txt"],
      ignoreGlobs: ["packages/package-b/**"],
    });
    expect(packages).toEqual(["package-a"]);
  });

  it("can find can handle empty files", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const packages = getPackagesByFiles({ root, files: [] });

    expect(packages).toEqual([]);
  });

  it("can find can handle unrelated files", () => {
    const root = setupFixture("monorepo-basic-yarn-1");

    const packages = getPackagesByFiles({ root, files: ["package.json"] });

    expect(packages).toEqual([]);
  });
});
