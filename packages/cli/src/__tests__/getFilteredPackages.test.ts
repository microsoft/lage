import { afterEach, describe, expect, it, jest } from "@jest/globals";
import createLogger, { LogLevel, type LogEntry, type LogStructuredData } from "@lage-run/logger";
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
    const log = jest.fn<(entry: LogEntry<LogStructuredData>) => void>();
    logger.addReporter({ log, summarize: jest.fn() });

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
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.info,
        data: {
          event: "packageFiltering",
          since: "HEAD~1",
          repoWideChanges: false,
          repoWideChangedFiles: [],
          changedPackages: [],
          hasChanges: false,
          fullBuild: false,
          packages: [],
        },
      })
    );
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

  it.each([
    {
      name: "matching repo-wide changes",
      repoWideChanges: ["packages/a/test.txt"],
      repoChanged: true,
      expectedChangedFiles: ["packages/a/test.txt"],
      expectedPackages: ["a", "b", "c"],
    },
    {
      name: "no matching repo-wide changes",
      repoWideChanges: ["packages/b/test.txt"],
      repoChanged: false,
      expectedChangedFiles: [],
      expectedPackages: ["a"],
    },
  ])("should report $name", async ({ repoWideChanges, repoChanged, expectedChangedFiles, expectedPackages }) => {
    const logger = createLogger();
    const log = jest.fn<(entry: LogEntry<LogStructuredData>) => void>();
    logger.addReporter({ log, summarize: jest.fn() });

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
      repoWideChanges,
    });

    expect(filteredPackages).toEqual(expectedPackages);
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        level: LogLevel.info,
        msg: `Repo-wide changes detected: ${repoChanged}`,
        data: {
          event: "packageFiltering",
          since: "HEAD~1",
          repoWideChanges: repoChanged,
          repoWideChangedFiles: expectedChangedFiles,
          changedPackages: ["a"],
          hasChanges: true,
          fullBuild: repoChanged,
          packages: expectedPackages,
        },
      })
    );
  });
});
