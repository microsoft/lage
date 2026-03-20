import path from "path";
import fs from "fs";
import os from "os";
import { createDefaultConfig } from "backfill-config";
import { setupFixture } from "backfill-utils-test";
import { fetch, put, makeLogger } from "../api.js";

function createMockPlugin(provider: { fetch: jest.Mock; put: jest.Mock }) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-test-"));
  const pluginPath = path.join(tmpDir, "mock-plugin.js");
  // Write a plugin module that returns the provider
  fs.writeFileSync(
    pluginPath,
    `module.exports = { default: { name: "mock", getProvider: () => ({}) } };`
  );
  // Override the getProvider at runtime by requiring and patching
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const mod = require(pluginPath);
  mod.default.getProvider = () => provider;
  return { pluginPath, tmpDir };
}

describe("api", () => {
  it("fetch works with custom plugin providers", async () => {
    const packageRoot = await setupFixture("basic");

    const logger = makeLogger("silly", process.stdout, process.stderr);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn().mockResolvedValue(true),
      put: jest.fn().mockResolvedValue(true),
    };

    const { pluginPath, tmpDir } = createMockPlugin(provider);

    config.cacheStorageConfig = {
      provider: "custom",
      plugin: pluginPath,
      options: {},
    };

    const fetched = await fetch(
      path.join(packageRoot, "packages", "package-1"),
      "hash",
      logger,
      config
    );

    expect(fetched).toBeTruthy();
    expect(provider.fetch).toHaveBeenCalled();
    expect(provider.put).not.toHaveBeenCalled();

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("put works with custom plugin providers", async () => {
    const packageRoot = await setupFixture("basic");

    const logger = makeLogger("silly", process.stdout, process.stderr);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn().mockResolvedValue(true),
      put: jest.fn().mockResolvedValue(true),
    };

    const { pluginPath, tmpDir } = createMockPlugin(provider);

    config.cacheStorageConfig = {
      provider: "custom",
      plugin: pluginPath,
      options: {},
    };

    await put(
      path.join(packageRoot, "packages", "package-1"),
      "hash",
      logger,
      config
    );

    expect(provider.fetch).not.toHaveBeenCalled();
    expect(provider.put).toHaveBeenCalled();

    fs.rmSync(tmpDir, { recursive: true });
  });
});
