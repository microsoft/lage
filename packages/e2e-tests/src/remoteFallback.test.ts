import { Monorepo } from "./mock/monorepo.js";
import { parseNdJson } from "./parseNdJson.js";

describe("RemoteFallbackCacheProvider", () => {
  it("should operate with local provider ONLY by default", () => {
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

    repo.cleanup();
  });
});
