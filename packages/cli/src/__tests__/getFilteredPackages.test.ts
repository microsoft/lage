import { afterEach, describe, expect, it, jest } from "@jest/globals";
import createLogger, { LogLevel, type LogEntry, type LogStructuredData } from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import { addGitObserver, getPackageInfos, type GitObserver } from "workspace-tools";
import { getFilteredPackages, type GetFilteredPackagesParams } from "../filter/getFilteredPackages.js";

describe("getFilteredPackages", () => {
  let monorepo: Monorepo | undefined;
  let stopObserving: (() => void) | undefined;

  function getFilteredPackagesWrapper(
    params: Pick<GetFilteredPackagesParams, "collectChangesForSince"> & {
      options?: Partial<GetFilteredPackagesParams["options"]>;
      config?: Partial<GetFilteredPackagesParams["config"]>;
      expectGitCalls?: number;
    }
  ) {
    const logger = createLogger();
    const log = jest.fn<(entry: LogEntry<LogStructuredData>) => void>();
    logger.addReporter({ log, summarize: jest.fn() });
    const gitObserver = jest.fn<GitObserver>();
    stopObserving = addGitObserver(gitObserver);

    const { repoChanges, packages } = getFilteredPackages({
      root: monorepo!.root,
      packageInfos: getPackageInfos(monorepo!.root),
      logger,
      options: { dependencies: false, dependents: false, ignore: [], ...params.options },
      config: { ignore: [], repoWideChanges: [], ...params.config },
      collectChangesForSince: params.collectChangesForSince,
    });

    params.expectGitCalls !== undefined && expect(gitObserver).toHaveBeenCalledTimes(params.expectGitCalls);

    return { repoChanges, packages: [...packages].sort(), log };
  }

  afterEach(async () => {
    stopObserving?.();
    stopObserving = undefined;
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  describe("without `since`", () => {
    it("returns all packages and skips git detection (even with collectChangesForSince: true)", async () => {
      monorepo = new Monorepo("getFilteredPackages-withoutSince");
      await monorepo.init({ packages: { a: {}, b: {} } });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        collectChangesForSince: true,
        expectGitCalls: 0,
      });
      expect(packages).toEqual(["a", "b"]);
      expect(repoChanges).toEqual({ status: "skipped" });
    });

    it.each<Partial<Omit<GetFilteredPackagesParams["options"], "ignore" | "since">> & { desc: string; expected: string[] }>([
      { desc: "excludes dependents of `scope` with dependents: false", scope: ["a"], expected: ["a"] },
      { desc: "includes dependents of `scope` with dependents: true", scope: ["a"], dependents: true, expected: ["a", "b"] },
      { desc: "excludes dependents of `to` even with dependents: true", to: ["a"], dependents: true, expected: ["a"] },
      { desc: "combines `scope` and `to`", scope: ["a"], to: ["b"], dependents: true, expected: ["a", "b"] },
      {
        desc: "includes dependencies of `to` with dependencies: true",
        to: ["b"],
        dependencies: true,
        dependents: true,
        expected: ["a", "b"],
      },
    ])("$desc", async ({ expected, desc, ...options }) => {
      monorepo = new Monorepo("getFilteredPackages-scopeWithoutSince");
      await monorepo.init({ packages: { a: {}, b: { internalDeps: ["a"] }, c: {} } });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options,
        expectGitCalls: 0,
        collectChangesForSince: true,
      });
      expect(packages).toEqual(expected);
      expect(repoChanges).toEqual({ status: "skipped" });
    });
  });

  describe("with `since`", () => {
    it("returns no packages if there are no changes", async () => {
      monorepo = new Monorepo("getFilterPackages-noChanges");
      await monorepo.init({ packages: { a: {}, b: {} } });

      const { packages } = getFilteredPackagesWrapper({
        options: { since: "HEAD" },
        expectGitCalls: 4,
      });
      expect(packages).toEqual([]);
    });

    it("selects all packages if a non-ignored file outside a package changes", async () => {
      monorepo = new Monorepo("getFilteredPackages-graphChanges");
      await monorepo.init({ packages: { foo1: {}, foo2: {} } });
      monorepo.commitFiles({
        "tsconfig.json": "not in a package",
        "packages/foo1/test.txt": "test content",
      });

      const { packages, repoChanges, log } = getFilteredPackagesWrapper({
        options: { since: "HEAD~1" },
        collectChangesForSince: true,
        expectGitCalls: 4,
      });

      expect(packages).toEqual(["foo1", "foo2"]);
      expect(repoChanges).toEqual({
        status: "success",
        changedFiles: ["packages/foo1/test.txt", "tsconfig.json"],
        repoWideChangedFiles: [],
      });

      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.silly,
          msg: "Repo-wide changes detected: false",
          data: {
            changedPackages: ["foo1", "foo2"],
            event: "packageFiltering",
            fullBuild: false,
            hasChanges: true,
            packages: ["foo1", "foo2"],
            repoChanged: false,
            repoWideChangedFiles: [],
            since: "HEAD~1",
          },
        })
      );
    });

    it("returns all packages after failed git detection without retrying", async () => {
      monorepo = new Monorepo("getFilteredPackages-failedChanges");
      await monorepo.init({ packages: { a: {}, b: {} } });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options: { since: "missing-ref" },
        expectGitCalls: 1,
      });
      expect(packages).toEqual(["a", "b"]);
      expect(repoChanges).toEqual({ status: "failed" });
    });

    it.each(["scope", "to"] as const)("respects `%s` even with failed git change detection", async (arg) => {
      monorepo = new Monorepo("getFilteredPackages-scopedFailure");
      await monorepo.init({ packages: { a: {}, b: {} } });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options: { since: "missing-ref", [arg]: ["a"] },
        collectChangesForSince: true,
        expectGitCalls: 1,
      });
      expect(packages).toEqual(["a"]);
      expect(repoChanges).toEqual({ status: "failed" });
    });

    // The detailed logic of different git tracking scenarios is tested in getRepoChanges
    it("collects package and repo-wide changes", async () => {
      monorepo = new Monorepo("getFilteredPackages-collectChanges");
      await monorepo.init({ packages: { a: {}, b: {} } });
      monorepo.writeFiles({
        "packages/a/changed.txt": "changed",
        "repo-wide.txt": "changed",
      });

      const { packages, repoChanges, log } = getFilteredPackagesWrapper({
        options: { since: "HEAD" },
        config: { repoWideChanges: ["repo-wide.txt"] },
        expectGitCalls: 4,
      });

      expect(packages).toEqual(["a", "b"]);
      expect(repoChanges).toEqual({
        status: "success",
        changedFiles: ["packages/a/changed.txt", "repo-wide.txt"],
        repoWideChangedFiles: ["repo-wide.txt"],
      });

      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.silly,
          msg: "Repo-wide changes detected: true",
          data: {
            changedPackages: ["a", "b"],
            event: "packageFiltering",
            fullBuild: true,
            hasChanges: true,
            packages: ["a", "b"],
            repoChanged: true,
            repoWideChangedFiles: ["repo-wide.txt"],
            since: "HEAD",
          },
        })
      );
    });

    it.each<{ desc: string; repoWideChanges: string[] }>([
      { desc: "combines command and config ignores when determining changed packages (no repoWideChanges)", repoWideChanges: [] },
      { desc: "disregards ignores if a file matching repoWideChanges has changed", repoWideChanges: ["packages/a/ignored.md"] },
    ])("$desc", async ({ repoWideChanges }) => {
      const hasRepoWideChanges = repoWideChanges.length > 0;

      monorepo = new Monorepo("getFilteredPackages-ignores");
      await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
      monorepo.writeFiles({
        "packages/a/ignored.md": "ignored by config",
        "packages/b/ignored.test.ts": "ignored by command",
        "packages/c/changed.ts": "changed",
      });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options: { since: "HEAD", ignore: ["**/*.test.ts"] },
        config: { ignore: ["**/*.md"], repoWideChanges },
        expectGitCalls: 4,
      });

      // Without repoWideChanges, only "c" is considered changed (files in "a" and "b" changed, but are ignored)
      expect(packages).toEqual(hasRepoWideChanges ? ["a", "b", "c"] : ["c"]);
      expect(repoChanges).toEqual({
        status: "success",
        // ignores do NOT apply to the raw list of changed files
        changedFiles: ["packages/a/ignored.md", "packages/b/ignored.test.ts", "packages/c/changed.ts"],
        repoWideChangedFiles: hasRepoWideChanges ? ["packages/a/ignored.md"] : [],
      });
    });

    it.each(["scope", "to"] as const)("with `%s`, keeps explicit scope and skips git detection despite repo-wide changes", async (arg) => {
      monorepo = new Monorepo("getFilteredPackages-scope");
      await monorepo.init({ packages: { a: {}, b: { internalDeps: ["a"] }, c: {} } });
      monorepo.writeFiles({
        "packages/c/changed.ts": "changed",
        "yarn.lock": "repo-wide change",
      });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options: { since: "HEAD", [arg]: ["a"] },
        config: { repoWideChanges: ["yarn.lock"] },
        expectGitCalls: 0,
      });

      expect(packages).toEqual(["a"]);
      expect(repoChanges).toEqual({ status: "skipped" });
    });

    // All these cases use --to/--scope but explicitly set collectChangesForSince: true.
    // The changed files should be calculated, but shouldn't impact the filtered package selection.
    it.each<{ desc: string; option: "scope" | "to"; repoWideChanges: boolean }>([
      { desc: "changed files", option: "scope", repoWideChanges: false },
      { desc: "changed files", option: "to", repoWideChanges: false },
      { desc: "repoWideChanges", option: "scope", repoWideChanges: true },
      { desc: "repoWideChanges", option: "to", repoWideChanges: true },
    ])("with collectChangesForSince and `$option`, still collects $desc separate from package selection", async (testCase) => {
      monorepo = new Monorepo("getFilteredPackages-scopedGraph");
      await monorepo.init({ packages: { a: {}, b: {} } });
      monorepo.writeFiles({
        "packages/b/changed.ts": "changed but ignored",
        "yarn.lock": "repo-wide change",
      });

      const { packages, repoChanges } = getFilteredPackagesWrapper({
        options: {
          since: "HEAD",
          [testCase.option]: ["a"],
          ignore: ["**/*.ts"],
        },
        config: { ignore: ["yarn.lock"], repoWideChanges: testCase.repoWideChanges ? ["yarn.lock"] : [] },
        collectChangesForSince: true,
        expectGitCalls: 4,
      });

      // Only the explicitly scoped package should be included in the selection
      expect(packages).toEqual(["a"]);
      expect(repoChanges).toEqual({
        status: "success",
        changedFiles: ["packages/b/changed.ts", "yarn.lock"],
        repoWideChangedFiles: testCase.repoWideChanges ? ["yarn.lock"] : [],
      });
    });

    it("respects `ignore` flag", async () => {
      monorepo = new Monorepo("getFilterPackages-ignore");
      await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
      monorepo.commitFiles({ "packages/a/just-a-test.txt": "test" });

      const { log, packages, repoChanges } = getFilteredPackagesWrapper({
        options: { since: "HEAD~1", ignore: ["packages/a/just-a-test.txt"] },
      });
      expect(repoChanges).toEqual({ status: "success", changedFiles: ["packages/a/just-a-test.txt"], repoWideChangedFiles: [] });
      expect(packages).toHaveLength(0);
      expect(log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: LogLevel.silly,
          msg: "Repo-wide changes detected: false",
          data: {
            event: "packageFiltering",
            since: "HEAD~1",
            repoChanged: false,
            repoWideChangedFiles: [],
            changedPackages: [],
            hasChanges: false,
            fullBuild: false,
            packages: [],
          },
        })
      );
    });
  });
});
