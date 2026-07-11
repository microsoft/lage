import { afterEach, describe, expect, it } from "@jest/globals";
import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import execa from "execa";
import fs from "fs";
import path from "path";
import { getPackageInfosAsync } from "workspace-tools";
import { getFilteredPackages } from "../filter/getFilteredPackages.js";
import { getLockfileChangedPackages } from "../filter/getLockfileChangedPackages.js";

const baseLockfile = `lockfileVersion: '9.0'

importers:

  .: {}

  packages/a:
    dependencies:
      semver:
        specifier: 7.5.4
        version: 7.5.4

  packages/b:
    dependencies:
      chalk:
        specifier: 4.1.2
        version: 4.1.2

  packages/c:
    dependencies:
      js-yaml:
        specifier: 4.1.0
        version: 4.1.0

snapshots:

  semver@7.5.4: {}

  chalk@4.1.2: {}

  js-yaml@4.1.0: {}
`;

// Only packages/c's dependency (js-yaml) is bumped; a and b are untouched.
const changedLockfile = baseLockfile.replace(/4\.1\.0/g, "4.2.0");

const rootImporterChangedLockfile = baseLockfile
  .replace(
    "  .: {}",
    `  .:
    devDependencies:
      typescript:
        specifier: 5.8.3
        version: 5.8.3`
  )
  .replace(
    "snapshots:\n",
    `snapshots:

  typescript@5.8.3: {}
`
  );

describe("experimental pnpm lockfile invalidation (--since)", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  async function setupWithLockfileChange(): Promise<Monorepo> {
    const repo = new Monorepo("lockfile-invalidation-since");
    await repo.init({ packages: { a: {}, b: {}, c: {} } });
    // Commit the base lockfile (this becomes HEAD~1).
    await repo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    // Commit only a lockfile change that affects package c's closure (this becomes HEAD).
    await repo.commitFiles({ "pnpm-lock.yaml": changedLockfile });
    return repo;
  }

  async function filterSince(repo: Monorepo, since = "HEAD"): Promise<string[]> {
    return getFilteredPackages({
      root: repo.root,
      packageInfos: await getPackageInfosAsync(repo.root),
      includeDependents: false,
      includeDependencies: false,
      since,
      sinceIgnoreGlobs: [],
      scope: [],
      logger: createLogger(),
      repoWideChanges: ["pnpm-lock.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });
  }

  it("only runs packages whose closure changed when the feature is enabled", async () => {
    const logger = createLogger();
    monorepo = await setupWithLockfileChange();

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["pnpm-lock.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });

    expect(filteredPackages.sort()).toEqual(["c"]);
  });

  it("owns lockfile matches from wildcard repo-wide globs", async () => {
    const logger = createLogger();
    monorepo = await setupWithLockfileChange();

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["**/*.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });

    expect(filteredPackages.sort()).toEqual(["c"]);
  });

  it("falls back to blanket invalidation when the feature is disabled", async () => {
    const logger = createLogger();
    monorepo = await setupWithLockfileChange();

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["pnpm-lock.yaml"],
    });

    // Without the feature, a lockfile change is repo-wide and runs everything.
    expect(filteredPackages.sort()).toEqual(["a", "b", "c"]);
  });

  it("does no lockfile analysis and behaves normally when the lockfile is unchanged", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("lockfile-invalidation-unchanged");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    // Change only package a's source; the lockfile is unchanged.
    await monorepo.commitFiles({ "packages/a/src.js": "console.log('a');" });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["pnpm-lock.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });

    expect(filteredPackages.sort()).toEqual(["a"]);
  });

  it("falls back to blanket invalidation for an unsupported lockfile version", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("lockfile-invalidation-unsupported");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": "lockfileVersion: '5.4'\ndependencies: {}\n" });
    await monorepo.commitFiles({ "pnpm-lock.yaml": "lockfileVersion: '5.4'\ndependencies:\n  semver: 7.5.4\n" });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["pnpm-lock.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });

    // Unsupported version -> keep blanket behavior (all packages run).
    expect(filteredPackages.sort()).toEqual(["a", "b", "c"]);
  });

  it("falls back to blanket invalidation when the root importer changes", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("lockfile-invalidation-root-importer");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    await monorepo.commitFiles({ "pnpm-lock.yaml": rootImporterChangedLockfile });

    const filteredPackages = getFilteredPackages({
      root: monorepo.root,
      packageInfos: await getPackageInfosAsync(monorepo.root),
      includeDependents: false,
      includeDependencies: false,
      since: "HEAD~1",
      sinceIgnoreGlobs: [],
      scope: [],
      logger,
      repoWideChanges: ["pnpm-lock.yaml"],
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
    });

    expect(filteredPackages.sort()).toEqual(["a", "b", "c"]);
  });

  it("precisely analyzes an unstaged lockfile change", async () => {
    monorepo = new Monorepo("lockfile-invalidation-unstaged");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    monorepo.writeFiles({ "pnpm-lock.yaml": changedLockfile });

    expect((await filterSince(monorepo)).sort()).toEqual(["c"]);
  });

  it("precisely analyzes a staged lockfile change", async () => {
    monorepo = new Monorepo("lockfile-invalidation-staged");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    monorepo.writeFiles({ "pnpm-lock.yaml": changedLockfile });
    execa.sync("git", ["add", "pnpm-lock.yaml"], { cwd: monorepo.root });

    expect((await filterSince(monorepo)).sort()).toEqual(["c"]);
  });

  it("falls back to blanket invalidation for a deleted lockfile", async () => {
    monorepo = new Monorepo("lockfile-invalidation-deleted");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });
    fs.unlinkSync(path.join(monorepo.root, "pnpm-lock.yaml"));

    expect((await filterSince(monorepo)).sort()).toEqual(["a", "b", "c"]);
  });

  it("falls back to blanket invalidation for a newly added untracked lockfile", async () => {
    monorepo = new Monorepo("lockfile-invalidation-untracked");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    monorepo.writeFiles({ "pnpm-lock.yaml": baseLockfile });

    expect((await filterSince(monorepo)).sort()).toEqual(["a", "b", "c"]);
  });

  it("falls back to blanket invalidation when global installation metadata changes", async () => {
    monorepo = new Monorepo("lockfile-invalidation-global-metadata");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": `settings:\n  autoInstallPeers: true\n${baseLockfile}` });
    await monorepo.commitFiles({ "pnpm-lock.yaml": `settings:\n  autoInstallPeers: false\n${baseLockfile}` });

    expect((await filterSince(monorepo, "HEAD~1")).sort()).toEqual(["a", "b", "c"]);
  });

  it("falls back to blanket invalidation for malformed-but-parseable v9 lockfiles", async () => {
    monorepo = new Monorepo("lockfile-invalidation-malformed");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": "lockfileVersion: '9.0'\nimporters:\n  packages/a: invalid\n" });
    await monorepo.commitFiles({ "pnpm-lock.yaml": "lockfileVersion: '9.0'\nimporters:\n  packages/a: changed\n" });

    expect((await filterSince(monorepo, "HEAD~1")).sort()).toEqual(["a", "b", "c"]);
  });

  it("falls back when a merge-base cannot be determined", async () => {
    monorepo = new Monorepo("lockfile-invalidation-merge-base");
    await monorepo.init({ packages: { a: {}, b: {}, c: {} } });
    await monorepo.commitFiles({ "pnpm-lock.yaml": baseLockfile });

    const result = getLockfileChangedPackages({
      root: monorepo.root,
      since: "missing-ref",
      changedFiles: ["pnpm-lock.yaml"],
      packageInfos: await getPackageInfosAsync(monorepo.root),
      experimentalLockfileInvalidation: { packageManager: "pnpm" },
      logger: createLogger(),
    });

    expect(result.status).toBe("fallback");
    if (result.status === "fallback") {
      expect(result.reason).toContain("merge-base");
    }
  });
});
