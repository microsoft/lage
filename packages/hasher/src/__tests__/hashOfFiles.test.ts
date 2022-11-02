import path from "path";
import fs from "fs-extra";

import { Monorepo } from "@lage-run/monorepo-fixture";

import { generateHashOfFiles } from "../hashOfFiles";
import { getRepoInfoNoCache } from "../repoInfo";

const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("generateHashOfFiles()", () => {
  it("creates different hashes for different hashes", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(packageRoot, repoInfo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot, repoInfo);
    expect(hashOfPackage).not.toEqual(hashOfPackageWithFoo);

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "foo");
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithFoo2 = await generateHashOfFiles(packageRoot, repoInfo);
    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithFoo2);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    repoInfo = await getRepoInfoNoCache(packageRoot);
    const hashOfPackageWithoutFoo = await generateHashOfFiles(packageRoot, repoInfo);
    expect(hashOfPackage).toEqual(hashOfPackageWithoutFoo);
    await monorepo.cleanup();
  });

  it("is not confused by package names being substring of other packages", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;

    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageA = await generateHashOfFiles(path.join(packageRoot, "packages", "package-a"), repoInfo);

    await fs.mkdir(path.join(packageRoot, "packages", "package-abc"));
    await fs.writeFile(path.join(packageRoot, "packages", "package-abc", "foo"), "bar");

    repoInfo = await getRepoInfoNoCache(packageRoot);
    const newHashOfPackageA = await generateHashOfFiles(path.join(packageRoot, "packages", "package-a"), repoInfo);

    expect(hashOfPackageA).toEqual(newHashOfPackageA);
    await monorepo.cleanup();
  });

  it("file paths are included in hash", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "empty"));
    const packageRoot = monorepo.root;

    fs.writeFileSync(path.join(packageRoot, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithFoo = await generateHashOfFiles(packageRoot, repoInfo);

    fs.unlinkSync(path.join(packageRoot, "foo.txt"));
    fs.writeFileSync(path.join(packageRoot, "bar.txt"), "bar");
    repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackageWithBar = await generateHashOfFiles(packageRoot, repoInfo);

    expect(hashOfPackageWithFoo).not.toEqual(hashOfPackageWithBar);
    await monorepo.cleanup();
  });

  // This test will be run on Windows and on Linux on the CI
  it("file paths are consistent across platforms", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "empty"));
    const packageRoot = monorepo.root;

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(packageRoot, "foo");

    fs.mkdirpSync(folder);

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(packageRoot);

    const hashOfPackage = await generateHashOfFiles(packageRoot, repoInfo);

    expect(hashOfPackage).toEqual("4d4ca2ecc436e1198554f5d03236ea8f956ac0c4");
    await monorepo.cleanup();
  });

  // This test will be run on Windows and on Linux on the CI
  it("file paths in a package not defined in a workspace (malformed monorepo) are consistent across platforms (uses slow path)", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "empty"));
    const workspaceRoot = monorepo.root;

    // Create a folder to make sure we get folder separators as part of the file name
    const folder = path.join(workspaceRoot, "packages", "foo");

    fs.mkdirpSync(folder);

    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");
    let repoInfo = await getRepoInfoNoCache(workspaceRoot);

    const hashOfPackage = await generateHashOfFiles(folder, repoInfo);

    expect(hashOfPackage).toEqual("438b5f734e6de1ef0eb9114a28ef230a9ff83f54");
    await monorepo.cleanup();
  });

  it("file paths in a monorepo are consistent across platforms (uses fast path)", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const workspaceRoot = monorepo.root;

    const folder = path.join(workspaceRoot, "packages", "package-a");
    fs.writeFileSync(path.join(folder, "foo.txt"), "bar");

    let repoInfo = await getRepoInfoNoCache(workspaceRoot);

    const hashOfPackage = await generateHashOfFiles(folder, repoInfo);

    expect(hashOfPackage).toEqual("b91634233c6a3768136391c804967bf0e0a6578d");
    await monorepo.cleanup();
  });
});
