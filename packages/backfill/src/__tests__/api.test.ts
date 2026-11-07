import { describe, expect, it, jest } from "@jest/globals";
import path from "path";
import fs from "fs";
import os from "os";
import { createRequire } from "module";
import {
  createDefaultConfig,
  type CustomCacheStoragePlugin,
  type ICacheStorage,
} from "backfill-config";
import { setupFixture } from "@lage-run/test-utilities";
import { fetch, put, makeLogger } from "../api.js";
import { Stream } from "stream";

function createMockPlugin(provider: ICacheStorage) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "backfill-test-"));
  const pluginPath = path.join(tmpDir, "mock-plugin.js");
  // Write a plugin module that returns the provider
  fs.writeFileSync(
    pluginPath,
    `module.exports = { default: { name: "mock", getProvider: () => ({}) } };`
  );
  // Override the getProvider at runtime by requiring and patching
  const mod: { default: CustomCacheStoragePlugin } =
    createRequire(__filename)(pluginPath);
  mod.default.getProvider = () => provider;
  return { pluginPath, tmpDir };
}

describe("api", () => {
  const mockStream = new Stream.PassThrough();

  it("fetch works with custom plugin providers", async () => {
    const packageRoot = setupFixture("basic");

    const logger = makeLogger("silly", mockStream, mockStream);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn(() => Promise.resolve(true)),
      put: jest.fn(() => Promise.resolve()),
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
    const packageRoot = setupFixture("basic");

    const logger = makeLogger("silly", mockStream, mockStream);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn(() => Promise.resolve(true)),
      put: jest.fn(() => Promise.resolve()),
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
