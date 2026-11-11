import { afterEach, describe, expect, jest, test } from "@jest/globals";
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
    jest.restoreAllMocks();
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

  test.each([true, false])("preserves Git file selection without per-file stats (includeUntracked: %s)", async (includeUntracked) => {
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
    const renamed = "packages/package-a/renamed \u8774\u8776 file.txt";
    await git(["rm", "--", "packages/package-a/staged-removed.txt"]);
    await git(["mv", "--", "packages/package-a/renamed.txt", renamed]);
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
    const exists = jest.spyOn(fs, "existsSync");
    await packageTree.initialize();

    expect(packageTree.getPackageFiles("package-a", ["**/*.txt"]).sort()).toEqual(
      [
        renamed,
        "packages/package-a/skipped-present.txt",
        "packages/package-a/staged.txt",
        "packages/package-a/working.txt",
        ...(includeUntracked ? ["packages/package-a/untracked space.txt"] : []),
      ].sort()
    );
    expect(exists.mock.calls.map(([file]) => path.relative(root, String(file)).replace(/\\/g, "/")).sort()).toEqual([
      "packages/package-a/skipped-present.txt",
      "packages/package-a/skipped.txt",
    ]);

    exists.mockRestore();
    fs.unlinkSync(path.join(root, "packages/package-a/staged.txt"));
    await packageTree.initialize();
    expect(packageTree.getPackageFiles("package-a", ["**/*.txt"])).not.toContain("packages/package-a/staged.txt");
  });

  test("checks symlink targets rather than including dangling links", async () => {
    monorepo = new Monorepo("symlinks");
    await monorepo.init({ packages: { "package-a": {} } });
    const root = monorepo.root;
    const target = path.join(root, "link-target");
    fs.mkdirSync(target);
    const link = "packages/package-a/link";
    // Junctions allow this check on Windows without symlink privileges.
    fs.symlinkSync(target, path.join(root, link), "junction");
    const { stdout: objectId } = await execa("git", ["hash-object", "-w", "--stdin"], { cwd: root, input: target });
    await execa("git", ["update-index", "--add", "--cacheinfo", `120000,${objectId},${link}`], { cwd: root });
    const packageTree = new PackageTree({ includeUntracked: false, root, packageInfos: getPackageInfos(root) });

    await packageTree.initialize();
    expect(packageTree.getPackageFiles("package-a", ["**/*"])).toContain(link);

    fs.rmdirSync(target);
    await packageTree.initialize();
    expect(packageTree.getPackageFiles("package-a", ["**/*"])).not.toContain(link);
  });

  test("preserves unmerged and unusual paths when rooted below the Git repository", async () => {
    monorepo = new Monorepo("nested-git-root");
    await monorepo.init({
      packages: {
        "package-a": { extraFiles: { "conflict.txt": "working copy", "space \u8774\u8776.txt": "text" } },
      },
    });
    const root = monorepo.root;
    const file = "packages/package-a/conflict.txt";
    const { stdout: objectId } = await execa("git", ["hash-object", "-w", "--stdin"], { cwd: root, input: "conflict" });
    await execa("git", ["update-index", "--index-info"], {
      cwd: root,
      input: `0 ${"0".repeat(40)}\t${file}\n100644 ${objectId} 1\t${file}\n100644 ${objectId} 2\t${file}\n100644 ${objectId} 3\t${file}\n`,
    });
    const packageTree = new PackageTree({
      includeUntracked: false,
      root: path.join(root, "packages"),
      packageInfos: getPackageInfos(root),
    });
    await packageTree.initialize();

    expect(packageTree.getPackageFiles("package-a", ["**/*.txt"]).sort()).toEqual([
      "package-a/conflict.txt",
      "package-a/space \u8774\u8776.txt",
    ]);
  });

  test.each([true, false])("propagates Git failures (includeUntracked: %s)", async (includeUntracked) => {
    monorepo = new Monorepo("not-a-git-repo");
    const packageTree = new PackageTree({ includeUntracked, root: monorepo.root, packageInfos: {} });

    await expect(packageTree.initialize()).rejects.toMatchObject({ exitCode: 128 });
  });
});
