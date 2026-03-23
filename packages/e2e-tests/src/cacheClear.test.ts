import fs from "fs";
import path from "path";

import { Monorepo } from "./mock/monorepo.js";

const defaultCacheLocation = "node_modules/.cache/lage/cache";

describe("Cache clear", () => {
  let repo: Monorepo | undefined;

  afterEach(async () => {
    await repo?.cleanup();
    repo = undefined;
  });

  it("should clear cache with the default cache location", async () => {
    repo = new Monorepo("cache-default");

    await repo.init({
      lageConfig: {
        pipeline: { build: [] },
      },
      packages: {
        a: { scripts: { build: "echo a:build", test: "echo a:test" } },
        b: { scripts: { build: "echo b:build" } },
      },
    });
    repo.install();

    // Run build so we get a cache folder
    await repo.run("build");

    const cacheFolder = path.join(repo.root, defaultCacheLocation);

    // Cache is created in the right place
    expect(fs.existsSync(cacheFolder)).toBeTruthy();

    // Check that cache folder is actually populated
    expect(fs.readdirSync(cacheFolder)).toHaveLength(2);

    // Clear the cache
    await repo.run("clear");

    // Cache folders should be empty
    expect(fs.readdirSync(cacheFolder)).toHaveLength(0);
  });
});
