import fs from "fs";
import path from "path";

import { Monorepo } from "./mock/monorepo.js";

const defaultCacheLocation = "node_modules/.cache/lage/cache";

describe("Cache clear", () => {
  it("should clear cache with the default cache location", async () => {
    const repo = new Monorepo("cache-default");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
        },
        cache: true,
      };`
    );

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.install();

    // Run build so we get a cache folder
    repo.run("build");

    const cacheFolder = path.join(repo.root, defaultCacheLocation);

    // Cache is created in the right place
    expect(fs.existsSync(cacheFolder)).toBeTruthy();

    // Check that cache folder is actually populated
    expect(fs.readdirSync(cacheFolder)).toHaveLength(2);

    // Clear the cache

    repo.run("clear");

    // Cache folders should be empty
    expect(fs.readdirSync(cacheFolder)).toHaveLength(0);

    await repo.cleanup();
  });
});
