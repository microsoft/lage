import { afterEach, describe, expect, it } from "@jest/globals";
import type { TargetLogData } from "@lage-run/reporters";
import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";
import path from "path";

describe("RemoteFallbackCacheProvider", () => {
  let repo: Monorepo | undefined;

  /** Format the entries' relevant properties for simple string matching and easier debugging */
  function formatEntries(...output: string[]) {
    return parseNdJson(...output)
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

  // These tests are expensive, so most cases are covered in RemoteCacheFallbackProvider.test.ts.
  // Only cover an E2E options-passing case here.
  it("should wire remote cache configuration and --skip-local-cache through the CLI", async () => {
    repo = new Monorepo("fallback");

    await repo.init({
      lageConfig: {
        pipeline: { test: [] },
        cacheOptions: {
          writeRemoteCache: true,
          cacheStorageConfig: {
            provider: "local",
          },
          internalCacheFolder: path.join(repo.root, ".lage-cache-test"),
        },
      },
      packages: {
        a: { scripts: { test: "echo a:test" } },
      },
    });
    await repo.install();

    const results = await repo.run("test", ["--skip-local-cache"]);

    const formattedOutput = formatEntries(results.stdout, results.stderr);

    expect(formattedOutput).not.toContain("local cache fetch");
    expect(formattedOutput).toContain("remote fallback fetch");
    expect(formattedOutput).not.toContain("local cache put");
    expect(formattedOutput).toContain("remote fallback put");
  });
});
