import path from "path";
import fs from "fs";

import { removeTempDir, setupFixture } from "@lage-run/test-utilities";

import { generateHashOfFiles } from "../hashOfFiles.js";
import { getRepoInfoNoCache } from "../repoInfo.js";

describe("generateHashOfFiles()", () => {
  let root = "";

  afterEach(() => {
    root && removeTempDir(root);
    root = "";
  });

  it("creates different hashes for different contents", async () => {
    root = setupFixture("monorepo");
    let repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackage = generateHashOfFiles(root, repoInfo);

    fs.writeFileSync(path.join(root, "foo.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackageWithFoo = generateHashOfFiles(root, repoInfo);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(root, "foo.txt"), "foo");
    repoInfo = await getRepoInfoNoCache(root);
    const hashOfPackageWithFoo2 = generateHashOfFiles(root, repoInfo);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(root, "foo.txt"));
    repoInfo = await getRepoInfoNoCache(root);
    const hashOfPackageWithoutFoo = generateHashOfFiles(root, repoInfo);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
  });

  it("is not confused by package names being substring of other packages", async () => {
    root = setupFixture("monorepo");

    let repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackageA = generateHashOfFiles(
      path.join(root, "packages", "package-a"),
      repoInfo
    );

    fs.mkdirSync(path.join(root, "packages", "package-abc"));
    fs.writeFileSync(path.join(root, "packages", "package-abc", "foo"), "bar");

    repoInfo = await getRepoInfoNoCache(root);
    const newHashOfPackageA = generateHashOfFiles(
      path.join(root, "packages", "package-a"),
      repoInfo
    );

    expect(hashOfPackageA).toEqual(newHashOfPackageA);
  });

  it("file paths are included in hash", async () => {
    root = setupFixture("empty");

    fs.writeFileSync(path.join(root, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackageWithFoo = generateHashOfFiles(root, repoInfo);

    fs.unlinkSync(path.join(root, "foo.txt"));
    fs.writeFileSync(path.join(root, "bar.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackageWithBar = generateHashOfFiles(root, repoInfo);

    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithBar);
  });

  // This test will be run on Windows and on Linux on the CI
  it("file paths are consistent across platforms", async () => {
    root = setupFixture("empty");

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(root, "foo");

    fs.mkdirSync(folder, { recursive: true });

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    const repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackage = generateHashOfFiles(root, repoInfo);

    expect(hashOfPackage).toEqual("4d4ca2ecc436e1198554f5d03236ea8f956ac0c4");
  });

  // This test will be run on Windows and on Linux on the CI
  it("file paths not defined in a package (malformed monorepo) are consistent across platforms (uses slow path)", async () => {
    root = setupFixture("empty");

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(root, "packages", "foo");

    fs.mkdirSync(folder, { recursive: true });

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    const repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackage = generateHashOfFiles(folder, repoInfo);

    expect(hashOfPackage).toEqual("438b5f734e6de1ef0eb9114a28ef230a9ff83f54");
  });

  it("file paths in a monorepo are consistent across platforms (uses fast path)", async () => {
    root = setupFixture("monorepo");

    const folder = path.join(root, "packages", "package-a");
    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");

    const repoInfo = await getRepoInfoNoCache(root);

    const hashOfPackage = generateHashOfFiles(folder, repoInfo);

    expect(hashOfPackage).toEqual("b91634233c6a3768136391c804967bf0e0a6578d");
  });
});
