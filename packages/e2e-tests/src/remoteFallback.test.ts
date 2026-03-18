import type { TargetLogData } from "@lage-run/reporters";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";
import path from "path";

describe("RemoteFallbackCacheProvider", () => {
  let repo: Monorepo | undefined;

  /** Format the entries' relevant properties for simple string matching and easier debugging */
  function formatEntries(output: string) {
    return parseNdJson(output)
      .filter((entry) => !!entry.msg)
      .map((entry) => {
        if (entry.data && "target" in entry.data) {
          const { target } = entry.data as TargetLogData;
          return `[${target.id}] ${entry.msg} (in ${target.cwd})`;
        }
        return entry.msg;
      })
      .join("\n");
  }

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("should skip local cache population if --skip-local-cache is enabled", async () => {
    repo = new Monorepo("fallback");

    await repo.init({
      lageConfig: {
        pipeline: { build: [], test: [] },
        cacheOptions: {
          writeRemoteCache: true,
          cacheStorageConfig: {
            provider: "local",
          },
          internalCacheFolder: path.join(repo.root, ".lage-cache-test"),
        },
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    await repo.install();

    const results = await repo.run("test", ["--skip-local-cache"]);

    const formattedOutput = formatEntries(results.stdout + results.stderr);

    expect(formattedOutput).not.toContain("local cache fetch");
    expect(formattedOutput).toContain("remote fallback fetch");
    expect(formattedOutput).not.toContain("local cache put");
    expect(formattedOutput).toContain("remote fallback put");
  });

  it("should operate with local provider ONLY by default", async () => {
    repo = new Monorepo("fallback-local-only");

    await repo.init({
      lageConfig: {
        pipeline: { build: [], test: [] },
        cacheOptions: {},
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    await repo.install();

    const results = await repo.run("test");

    const formattedOutput = formatEntries(results.stdout + results.stderr);

    expect(formattedOutput).toContain("local cache fetch");
    expect(formattedOutput).not.toContain("remote fallback fetch");
    expect(formattedOutput).toContain("local cache put");
    expect(formattedOutput).not.toContain("remote fallback put");
  });

  it("should allow read-only mode when given a remote (or custom) cache config", async () => {
    repo = new Monorepo("fallback-read-only");

    await repo.init({
      lageConfig: {
        pipeline: { build: [], test: [] },
        cacheOptions: {
          cacheStorageConfig: {
            provider: "local",
          },
          internalCacheFolder: path.join(repo.root, ".lage-cache-test"),
        },
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    await repo.install();

    const results = await repo.run("test", ["--log-level", "silly"]);

    const formattedOutput = formatEntries(results.stdout + results.stderr);

    expect(formattedOutput).toContain("local cache fetch");
    expect(formattedOutput).toContain("remote fallback fetch");
    expect(formattedOutput).toContain("local cache put");
    expect(formattedOutput).not.toContain("remote fallback put");
  });

  it("should allow read-write mode when given a special environment variable", async () => {
    repo = new Monorepo("fallback-read-write-env-var");

    await repo.init({
      lageConfig: {
        pipeline: { build: [], test: [] },
        cacheOptions: {
          writeRemoteCache: true,
          cacheStorageConfig: {
            provider: "local",
          },
          internalCacheFolder: path.join(repo.root, ".lage-cache-test"),
        },
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    await repo.install();

    const results = await repo.run("test", ["--log-level", "silly"]);

    const formattedOutput = formatEntries(results.stdout + results.stderr);

    expect(formattedOutput).toContain("local cache fetch");
    expect(formattedOutput).toContain("remote fallback fetch");
    expect(formattedOutput).toContain("local cache put");
    expect(formattedOutput).toContain("remote fallback put");
  });
});
