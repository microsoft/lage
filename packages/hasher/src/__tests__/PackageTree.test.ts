import { afterEach, describe, expect, test } from "@jest/globals";
import { Monorepo } from "@lage-run/test-utilities";
import path from "path";
import { getPackageInfos } from "workspace-tools";
import { PackageTree } from "../PackageTree.js";

const fixturesPath = path.join(__dirname, "../__fixtures__");

describe("PackageTree", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  test("can find all files of a monorepo", async () => {
    monorepo = new Monorepo("monorepo");
    await monorepo.init({ fixturePath: path.join(fixturesPath, "monorepo") });

    const packageInfos = getPackageInfos(monorepo.root);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: monorepo.root,
      packageInfos,
    });

    await packageTree.initialize();

    const files = packageTree.getPackageFiles("package-a", ["**/*"]);

    expect(files).toHaveLength(3);
  });

  test("can find all files of a monorepo with a pattern", async () => {
    monorepo = new Monorepo("monorepo2");
    await monorepo.init({ fixturePath: path.join(fixturesPath, "monorepo") });

    const packageInfos = getPackageInfos(monorepo.root);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: monorepo.root,
      packageInfos,
    });

    await packageTree.initialize();

    const files = packageTree.getPackageFiles("package-a", ["**/*.ts"]);

    expect(files).toHaveLength(1);
  });

  test("can find all files of a monorepo with nested files", async () => {
    monorepo = new Monorepo("monorepo-nested");
    await monorepo.init({ fixturePath: path.join(fixturesPath, "monorepo-nested") });

    const packageInfos = getPackageInfos(monorepo.root);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: monorepo.root,
      packageInfos,
    });

    await packageTree.initialize();

    const files = packageTree.getPackageFiles("package-a", ["**/*.ts"]);
    const allFiles = packageTree.getPackageFiles("package-a", ["**/*"]);

    expect(files).toHaveLength(2);
    expect(allFiles).toHaveLength(4);

    const files2 = packageTree.getPackageFiles("package-b", ["**/*.ts"]);
    const allFiles2 = packageTree.getPackageFiles("package-b", ["**/*"]);

    expect(files2).toHaveLength(1);
    expect(allFiles2).toHaveLength(3);
  });
});
