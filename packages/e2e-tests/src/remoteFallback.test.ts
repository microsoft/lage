import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("RemoteFallbackCacheProvider", () => {
  it("should skip local cache population if --skip-local-cache is enabled", async () => {
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
            provider: 'local'
          },
          internalCacheFolder: '.lage-cache-test'
        } 
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

    const results = repo.run("test", ["--skip-local-cache"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeTruthy();

    await repo.cleanup();
  });

  it("should operate with local provider ONLY by default", async () => {
    const repo = new Monorepo("fallback-local-only");

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

    repo.addPackage("a", [], {
      build: "echo a:build",
      test: "echo a:test",
    });
    repo.addPackage("b", [], {
      build: "echo b:build",
    });
    repo.install();

    const results = repo.run("test");

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeFalsy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeFalsy();

    await repo.cleanup();
  });

  it("should allow read-only mode when given a remote (or custom) cache config", async () => {
    const repo = new Monorepo("fallback-read-only");

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
            provider: 'local'
          },
          internalCacheFolder: '.lage-cache-test'
        }  
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

    const results = repo.run("test", ["--log-level", "silly"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeFalsy();

    await repo.cleanup();
  });

  it("should allow read-write mode when given a special environment variable", async () => {
    const repo = new Monorepo("fallback-read-write-env-var");

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
            provider: 'local'
          },
          internalCacheFolder: '.lage-cache-test'
        }
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

    const results = repo.run("test", ["--log-level", "silly"]);

    const output = results.stdout + results.stderr;
    const jsonOutput = parseNdJson(output);

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback fetch"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("local cache put"))).toBeTruthy();

    expect(jsonOutput.find((entry) => entry.msg?.includes("remote fallback put"))).toBeTruthy();

    await repo.cleanup();
  });
});
