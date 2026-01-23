import path from "path";

import { PackageTree } from "../index";
import { Monorepo } from "@lage-run/monorepo-fixture";
import { getPackageInfos } from "workspace-tools";

const fixturesPath = path.join(__dirname, "..", "__fixtures__");

describe("PackageTree", () => {
  test("can find all files of a monorepo", async () => {
    const monorepo = new Monorepo("monorepo");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;

    const packageInfos = getPackageInfos(packageRoot);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: packageRoot,
      packageInfos,
    });

    await packageTree.initialize();

    const files = packageTree.getPackageFiles("package-a", ["**/*"]);

    expect(files).toHaveLength(3);
  });

  test("can find all files of a monorepo with a pattern", async () => {
    const monorepo = new Monorepo("monorepo2");
    await monorepo.init(path.join(fixturesPath, "monorepo"));
    const packageRoot = monorepo.root;

    const packageInfos = getPackageInfos(packageRoot);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: packageRoot,
      packageInfos,
    });

    await packageTree.initialize();

    const files = packageTree.getPackageFiles("package-a", ["**/*.ts"]);

    expect(files).toHaveLength(1);
  });

  test("can find all files of a monorepo with nested files", async () => {
    const monorepo = new Monorepo("monorepo-nested");
    await monorepo.init(path.join(fixturesPath, "monorepo-nested"));
    const packageRoot = monorepo.root;

    const packageInfos = getPackageInfos(packageRoot);

    const packageTree = new PackageTree({
      includeUntracked: true,
      root: packageRoot,
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
