import { afterEach, describe, expect, test } from "@jest/globals";
import { Monorepo } from "@lage-run/test-utilities";
import execa from "execa";
import fs from "fs";
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

  test.each([true, false])("handles index and working-tree changes (includeUntracked: %s)", async (includeUntracked) => {
    monorepo = new Monorepo("git-changes");
    await monorepo.init({
      packages: {
        "package-a": {
          extraFiles: {
            "removed.txt": "removed",
            "staged-removed.txt": "removed",
            "renamed.txt": "renamed",
            "working.txt": "before",
            "skipped.txt": "skipped",
            "skipped-present.txt": "present",
            "assumed.txt": "assumed",
          },
        },
      },
    });
    const root = monorepo.root;
    const git = (args: string[]) => execa("git", args, { cwd: root });
    await git(["rm", "--", "packages/package-a/staged-removed.txt"]);
    await git(["mv", "--", "packages/package-a/renamed.txt", "packages/package-a/renamed 蝴蝶 file.txt"]);
    await git(["update-index", "--skip-worktree", "--", "packages/package-a/skipped.txt", "packages/package-a/skipped-present.txt"]);
    await git(["update-index", "--assume-unchanged", "--", "packages/package-a/assumed.txt"]);
    for (const file of ["removed.txt", "skipped.txt", "assumed.txt"]) {
      fs.unlinkSync(path.join(root, "packages/package-a", file));
    }
    monorepo.writeFiles({
      "packages/package-a/working.txt": "after\r\n",
      "packages/package-a/staged.txt": "staged",
      "packages/package-a/untracked space.txt": "untracked",
      "packages/package-a/.gitignore": "ignored.txt",
      "packages/package-a/ignored.txt": "ignored",
    });
    await git(["add", "--", "packages/package-a/staged.txt", "packages/package-a/.gitignore"]);

    const packageTree = new PackageTree({ includeUntracked, root, packageInfos: getPackageInfos(root) });
    await packageTree.initialize();

    expect(packageTree.getPackageFiles("package-a", ["**/*.txt"]).sort()).toEqual(
      [
        "packages/package-a/renamed 蝴蝶 file.txt",
        "packages/package-a/skipped-present.txt",
        "packages/package-a/staged.txt",
        "packages/package-a/working.txt",
        ...(includeUntracked ? ["packages/package-a/untracked space.txt"] : []),
      ].sort()
    );
  });
});
