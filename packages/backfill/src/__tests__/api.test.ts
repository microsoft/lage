import { describe, expect, it, jest } from "@jest/globals";
import path from "path";
import { createDefaultConfig } from "backfill-config";
import { setupFixture } from "@lage-run/test-utilities";
import { fetch, put, makeLogger } from "../api.js";
import { Stream } from "stream";

describe("api", () => {
  const mockStream = new Stream.PassThrough();

  it("fetch works with custom providers", async () => {
    const packageRoot = setupFixture("basic");

    const logger = makeLogger("silly", mockStream, mockStream);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn(() => Promise.resolve(true)),
      put: jest.fn(() => Promise.resolve(true)),
    };

    config.cacheStorageConfig = {
      provider: () => provider as any,
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
  });

  it("put works with custom providers", async () => {
    const packageRoot = setupFixture("basic");

    const logger = makeLogger("silly", mockStream, mockStream);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn(() => Promise.resolve(true)),
      put: jest.fn(() => Promise.resolve(true)),
    };

    config.cacheStorageConfig = {
      provider: () => provider as any,
    };

    await put(
      path.join(packageRoot, "packages", "package-1"),
      "hash",
      logger,
      config
    );

    expect(provider.fetch).not.toHaveBeenCalled();
    expect(provider.put).toHaveBeenCalled();
  });
});
