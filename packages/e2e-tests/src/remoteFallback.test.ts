import { Monorepo } from "./mock/monorepo";
import { parseNdJson } from "./parseNdJson";

describe("RemoteFallbackCacheProvider", () => {
  const originalCacheProvider = process.env.BACKFILL_CACHE_PROVIDER;
  const originalCacheProviderOptions = process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;

  beforeEach(() => {
    delete process.env.BACKFILL_CACHE_PROVIDER;
    delete process.env.BACKFILL_CACHE_PROVIDER_OPTIONS;
  });

  afterEach(() => {
    process.env.BACKFILL_CACHE_PROVIDER = originalCacheProvider;
    process.env.BACKFILL_CACHE_PROVIDER_OPTIONS = originalCacheProviderOptions;
  });

  it("should skip local cache population if --skip-local-cache is enabled", () => {
    const repo = new Monorepo("fallback");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
          test: []
        },
        cache: true,
        cacheOptions: {
          writeRemoteCache: true,
          cacheStorageConfig: {
            provider: (logger, cwd) => ({
              async fetch(hash) {
                return false;
              },

              async put(hash, filesToCache) {
              },
            }),
          },
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

    const results = repo.run("test", ["--skip-local-cache"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeTruthy();

    repo.cleanup();
  });

  it("should operate with local provider ONLY by default", () => {
    const repo = new Monorepo("fallback");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
          test: []
        },
        cache: true,
        cacheOptions: {
          
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

    const results = repo.run("test", ["--verbose"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeFalsy();

    repo.cleanup();
  });

  it("should allow read-only mode when given a remote (or custom) cache config", () => {
    const repo = new Monorepo("fallback");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
          test: []
        },
        cache: true,
        cacheOptions: {
          cacheStorageConfig: {
            provider: (logger, cwd) => ({
              async fetch(hash) {
                return false;
              },

              async put(hash, filesToCache) {
              },
            }),
          },
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

    const results = repo.run("test", ["--log-level", "silly"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeFalsy();

    repo.cleanup();
  });

  it("should allow read-write mode when given a special environment variable", () => {
    const repo = new Monorepo("fallback");

    repo.init();
    repo.setLageConfig(
      `const fs = require('fs');
      const path = require('path');
      module.exports = {
        pipeline: {
          build: [],
          test: []
        },
        cache: true,
        cacheOptions: {
          writeRemoteCache: true,
          cacheStorageConfig: {
            provider: (logger, cwd) => ({
              async fetch(hash) {
                return false;
              },

              async put(hash, filesToCache) {
              },
            }),
          },
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

    const results = repo.run("test", ["--log-level", "silly"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeTruthy();

    repo.cleanup();
  });
});
