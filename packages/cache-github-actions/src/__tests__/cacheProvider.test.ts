import { describe, expect, it } from "@jest/globals";
import { execFileSync } from "child_process";
import path from "path";

describe("GitHub Actions cache provider", () => {
  it("loads the ESM cache client and honors disabled restores and saves", () => {
    const script = `
      const assert = require("node:assert/strict");
      const { cacheProvider } = require("./lib/cacheProvider.js");
      const provider = cacheProvider.provider({}, process.cwd());
      (async () => {
        assert.equal(await provider.fetch("test-cache-key"), false);
        await provider.put("test-cache-key", ["package.json"]);
      })().catch(error => { process.stderr.write(String(error)); process.exitCode = 1; });
    `;
    expect(() =>
      execFileSync(process.execPath, ["-e", script], {
        cwd: path.join(__dirname, "../.."),
        env: { ...process.env, ACTIONS_CACHE_MODE: "none" },
        stdio: "pipe",
      })
    ).not.toThrow();
  });
});
