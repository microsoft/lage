import fs from "fs";
import path from "path";

import { Monorepo } from "../mock/monorepo";
import { parseNdJson } from "./parseNdJson";

const defaultCacheLocation = "node_modules/.cache/backfill";
const cacheLocation = ".cache/backfill";

describe("Cache clear", () => {
  it("should clear cache when internalCacheFolder is passed", () => {
    const repo = new Monorepo("cache");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
        },
        cache: true,
        cacheOptions: {
          internalCacheFolder: '${cacheLocation}',
        }
      };`
    );

    repo.install();

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.linkPackages();

    // Run build so we get a cache folder
    repo.run("build");

    const cacheFolderA = path.join(repo.root, `packages/a/${cacheLocation}`);
    const cacheFolderB = path.join(repo.root, `packages/b/${cacheLocation}`);

    // Cache is created in the right place
    expect(fs.existsSync(cacheFolderA)).toBeTruthy();
    expect(fs.existsSync(cacheFolderB)).toBeTruthy();

    // Check that cache folder is actually populated
    expect(fs.readdirSync(cacheFolderA)).toHaveLength(1);
    expect(fs.readdirSync(cacheFolderB)).toHaveLength(1);

    // Clear the cache
    repo.run("clear");

    // Cache folders should be empty
    expect(fs.readdirSync(cacheFolderA)).toHaveLength(0);
    expect(fs.readdirSync(cacheFolderB)).toHaveLength(0);

    repo.cleanup();
  });

  it("should clear cache with the default cache location", () => {
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

    repo.install();

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.linkPackages();

    // Run build so we get a cache folder
    repo.run("build");

    const cacheFolderA = path.join(
      repo.root,
      `packages/a/${defaultCacheLocation}`
    );
    const cacheFolderB = path.join(
      repo.root,
      `packages/b/${defaultCacheLocation}`
    );

    // Cache is created in the right place
    expect(fs.existsSync(cacheFolderA)).toBeTruthy();
    expect(fs.existsSync(cacheFolderB)).toBeTruthy();

    // Check that cache folder is actually populated
    expect(fs.readdirSync(cacheFolderA)).toHaveLength(1);
    expect(fs.readdirSync(cacheFolderB)).toHaveLength(1);

    // Clear the cache

    repo.run("clear");

    // Cache folders should be empty
    expect(fs.readdirSync(cacheFolderA)).toHaveLength(0);
    expect(fs.readdirSync(cacheFolderB)).toHaveLength(0);

    repo.cleanup();
  });
});
