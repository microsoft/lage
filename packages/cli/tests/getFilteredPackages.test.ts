import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/monorepo-fixture";
import { getPackageInfos } from "workspace-tools";
import { getFilteredPackages } from "../src/filter/getFilteredPackages";

describe("getFilteredPackages", () => {
  it("should respect the ignore flag when since flag is used", async () => {
    const logger = createLogger();

    const monorepo = new Monorepo("getFilterPackages-ignore");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.addPackage("b");
    await monorepo.addPackage("c");

    await monorepo.linkPackages();

    await monorepo.commitFiles({
      "packages/a/just-a-test.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: getPackageInfos(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: ["packages/a/just-a-test.txt"],
      scope: [],
      logger,
      repoWideChanges: [],
    });

    expect(filteredPackages.length).toEqual(0);

    await monorepo.cleanup();
  });

  it("should respect the since flag", async () => {
    const logger = createLogger();

    const monorepo = new Monorepo("getFilterPackages-since");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.addPackage("b");
    await monorepo.addPackage("c");

    await monorepo.linkPackages();

    await monorepo.commitFiles({
      "packages/a/just-a-test.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: getPackageInfos(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: [],
    });

    expect(filteredPackages).toContain("a");
    expect(filteredPackages).not.toContain("b");
    expect(filteredPackages).not.toContain("c");

    await monorepo.cleanup();
  });

  it("should respect the repoWideChanges flag", async () => {
    const logger = createLogger();

    const monorepo = new Monorepo("getFilterPackages-repoWideChanges");

    await monorepo.init();
    await monorepo.install();

    await monorepo.addPackage("a");
    await monorepo.addPackage("b");
    await monorepo.addPackage("c");

    await monorepo.linkPackages();

    await monorepo.commitFiles({
      "packages/a/dummy.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: getPackageInfos(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["packages/a/dummy.txt"],
    });

    expect(filteredPackages).toContain("a");
    expect(filteredPackages).toContain("b");
    expect(filteredPackages).toContain("c");

    await monorepo.cleanup();
  });
});
