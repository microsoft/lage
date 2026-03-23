import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import { getPackageInfosAsync } from "workspace-tools";
import { getFilteredPackages } from "../filter/getFilteredPackages.js";

describe("getFilteredPackages", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("should respect the ignore flag when since flag is used", async () => {
    const logger = createLogger();

    monorepo = new Monorepo("getFilterPackages-ignore");

    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });

    // The separate commit step is needed for these tests
    await monorepo.commitFiles({
      "packages/a/just-a-test.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: ["packages/a/just-a-test.txt"],
      scope: [],
      logger,
      repoWideChanges: [],
    });

    expect(filteredPackages.length).toEqual(0);
  });

  it("should respect the since flag", async () => {
    const logger = createLogger();

    monorepo = new Monorepo("getFilterPackages-since");

    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });

    await monorepo.commitFiles({
      "packages/a/just-a-test.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
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
  });

  it("should respect the repoWideChanges flag", async () => {
    const logger = createLogger();

    monorepo = new Monorepo("getFilterPackages-repoWideChanges");

    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });

    await monorepo.commitFiles({
      "packages/a/test.txt": "test content",
    });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["packages/a/test.txt"],
    });

    expect(filteredPackages).toContain("a");
    expect(filteredPackages).toContain("b");
    expect(filteredPackages).toContain("c");
  });
});
