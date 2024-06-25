// test out the findFilesInPath method of the PackageTree

import { Monorepo } from "@lage-run/monorepo-fixture";
import { PackageTree } from "../PackageTree";
import path from "path";

// given various patterns that exercises the globby functionality with extgob, etc.
describe("PackageTree", () => {
  async function setupFixture(fixture = "monorepo") {
    const monorepo = new Monorepo(fixture);
    await monorepo.init(path.join(fixturesPath, fixture));
    return monorepo;
  }

  const fixturesPath = path.join(__dirname, "../__fixtures__");

  it("should find all files in a package using globby basic pattern", async () => {
    const monorepo = await setupFixture("basic");
    const packagePath = monorepo.root;
    const patterns = ["**/*"];

    const packageTree = new PackageTree({ root: packagePath, includeUntracked: true });
    await packageTree.initialize();

    const files = (await packageTree.findFilesInPath(packagePath, patterns))
      .map((p) => path.relative(packagePath, p))
      .map((p) => p.replace(/\\/g, "/"));

    expect(files).toMatchInlineSnapshot(`
      [
        "package.json",
        "yarn.lock",
        "src/index.ts",
        "node_modules/package-2/package.json",
      ]
    `);

    monorepo.cleanup();
  });

  it("should find all files in a package using globby with extglob", async () => {
    const monorepo = await setupFixture("basic");
    const packagePath = monorepo.root;

    const patterns = ["**/*.+(json|ts)", "!yarn.lock"];

    const packageTree = new PackageTree({ root: packagePath, includeUntracked: true });
    await packageTree.initialize();

    const files = (await packageTree.findFilesInPath(packagePath, patterns))
      .map((p) => path.relative(packagePath, p))
      .map((p) => p.replace(/\\/g, "/"));

    expect(files).toMatchInlineSnapshot(`
      [
        "package.json",
        "src/index.ts",
        "node_modules/package-2/package.json",
      ]
    `);

    monorepo.cleanup();
  });

  it("should find all files in a package using globby with extglob of sub-exclusion pattern", async () => {
    const monorepo = await setupFixture("monorepo-with-deps");
    const packagePath = monorepo.root;
    const patterns = ["**/!(package.json)"];

    const packageTree = new PackageTree({ root: packagePath, includeUntracked: true });
    await packageTree.initialize();

    const files = (await packageTree.findFilesInPath(packagePath, patterns))
      .map((p) => path.relative(packagePath, p))
      .map((p) => p.replace(/\\/g, "/"));

    expect(files).toMatchInlineSnapshot(`
      [
        "yarn.lock",
        "node_modules/.yarn-integrity",
        "node_modules/package-b/src/index.ts",
        "node_modules/package-a/src/index.ts",
        "packages/package-b/src/index.ts",
        "packages/package-a/src/index.ts",
      ]
    `);

    monorepo.cleanup();
  });
});
