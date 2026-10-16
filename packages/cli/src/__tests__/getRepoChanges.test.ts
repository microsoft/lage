import { afterEach, describe, expect, it, jest } from "@jest/globals";
import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import fs from "fs";
import path from "path";
import { addGitObserver, git, type GitObserver } from "workspace-tools";
import { getRepoChanges } from "../filter/getRepoChanges.js";

describe("getRepoChanges", () => {
  let monorepo: Monorepo | undefined;
  let stopObserving: (() => void) | undefined;

  /** Collect changes while capturing logs and optionally checking git call counts. Sorts result arrays. */
  function getRepoChangesWrapper(
    params: Pick<Parameters<typeof getRepoChanges>[0], "since"> & {
      repoWideChanges?: string[];
      expectGitCalls?: number;
    }
  ) {
    const gitObserver = jest.fn<GitObserver>();
    stopObserving = addGitObserver(gitObserver);

    const repoChanges = getRepoChanges({
      root: monorepo!.root,
      logger: createLogger(),
      since: params.since,
      repoWideChanges: params.repoWideChanges ?? [],
    });

    params.expectGitCalls !== undefined && expect(gitObserver).toHaveBeenCalledTimes(params.expectGitCalls);

    if (repoChanges.status === "success") {
      repoChanges.changedFiles.sort();
      repoChanges.repoWideChangedFiles.sort();
    }

    return repoChanges;
  }

  afterEach(async () => {
    stopObserving?.();
    stopObserving = undefined;
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("skips git detection without `since`", async () => {
    monorepo = new Monorepo("getRepoChanges-skippedChanges");
    await monorepo.init({ packages: { a: {} } });

    const repoChanges = getRepoChangesWrapper({ since: undefined, expectGitCalls: 0 });
    expect(repoChanges).toEqual({ status: "skipped" });
  });

  it("returns a successful empty result when no files changed", async () => {
    monorepo = new Monorepo("getRepoChanges-noChanges");
    await monorepo.init({ packages: { a: {} } });

    const repoChanges = getRepoChangesWrapper({ since: "HEAD", expectGitCalls: 4 });
    expect(repoChanges).toEqual({ status: "success", changedFiles: [], repoWideChangedFiles: [] });
  });

  it("reports failed detection without retrying git", async () => {
    monorepo = new Monorepo("getRepoChanges-failedChanges");
    await monorepo.init({ packages: { a: {} } });

    const repoChanges = getRepoChangesWrapper({ since: "missing-ref", expectGitCalls: 1 });
    expect(repoChanges).toEqual({ status: "failed" });
  });

  it.each(["committed", "staged", "unstaged", "untracked"] as const)("reports %s changes and repoWideChanges", async (changeType) => {
    monorepo = new Monorepo(`getRepoChanges-${changeType}Changes`);
    await monorepo.init({
      packages: { a: {} },
      extraFiles: {
        "packages/a/committed.txt": "",
        "packages/a/staged.txt": "",
        "packages/a/unstaged.txt": "",
        "config/tsconfig.json": "{}",
      },
    });

    // untracked.txt will be new, the others exist in git already
    const filePath = `packages/a/${changeType}.txt`;
    const extraFilePath = "config/extra.json";
    monorepo.writeFiles(
      { [filePath]: "content", [extraFilePath]: "{}" },
      { stage: changeType === "staged", commit: changeType === "committed" }
    );

    const repoChanges = getRepoChangesWrapper({
      since: changeType === "committed" ? "HEAD~1" : "HEAD",
      expectGitCalls: 4,
      repoWideChanges: ["config/*.json"],
    });
    expect(repoChanges).toEqual({
      status: "success",
      changedFiles: [extraFilePath, filePath],
      repoWideChangedFiles: [extraFilePath],
    });
  });

  it.each(["committed", "staged", "unstaged"] as const)("reports %s deleted changes and repoWideChanges", async (changeType) => {
    monorepo = new Monorepo(`getRepoChanges-${changeType}DeletedChanges`);
    const filePath = "packages/a/deleted.txt";
    const configPath = "config/deleted.json";
    await monorepo.init({
      packages: { a: {} },
      extraFiles: { [filePath]: "", "packages/a/other.txt": "", [configPath]: "{}" },
    });

    if (changeType === "unstaged") {
      fs.unlinkSync(path.join(monorepo.root, filePath));
      fs.unlinkSync(path.join(monorepo.root, configPath));
    } else {
      // git rm stages the change
      git(["rm", "--", filePath, configPath], { cwd: monorepo.root, throwOnError: true });
      if (changeType === "committed") {
        git(["commit", "-m", "delete files"], { cwd: monorepo.root, throwOnError: true });
      }
    }

    const repoChanges = getRepoChangesWrapper({
      since: changeType === "committed" ? "HEAD~1" : "HEAD",
      expectGitCalls: 4,
      repoWideChanges: ["config/*.json"],
    });
    expect(repoChanges).toEqual({ status: "success", changedFiles: [configPath, filePath], repoWideChangedFiles: [configPath] });
  });

  it("excludes files matched by negated repoWideChanges", async () => {
    monorepo = new Monorepo("getRepoChanges-negated");
    await monorepo.init({
      packages: { a: {} },
      extraFiles: { "config/excluded.json": "{}", "config/included.json": "{}" },
    });
    monorepo.commitFiles({ "config/included.json": '{"updated": true}', "config/excluded.json": '{"updated": true}' });

    const repoChanges = getRepoChangesWrapper({
      since: "HEAD~1",
      repoWideChanges: ["config/*.json", "!config/excluded.json"],
    });
    expect(repoChanges).toEqual({
      status: "success",
      changedFiles: ["config/excluded.json", "config/included.json"],
      repoWideChangedFiles: ["config/included.json"],
    });
  });

  it("deduplicates change categories", async () => {
    monorepo = new Monorepo("getRepoChanges-deduplicate");
    await monorepo.init({
      packages: { a: {} },
      extraFiles: {
        "packages/a/file.txt": "original",
      },
    });
    monorepo.commitFiles({ "packages/a/file.txt": "committed" });
    monorepo.stageFiles({ "packages/a/file.txt": "staged" });
    monorepo.writeFiles({ "packages/a/file.txt": "unstaged" });

    const repoChanges = getRepoChangesWrapper({ since: "HEAD~1", expectGitCalls: 4 });
    expect(repoChanges).toEqual({
      status: "success",
      changedFiles: ["packages/a/file.txt"],
      repoWideChangedFiles: [],
    });
  });
});
