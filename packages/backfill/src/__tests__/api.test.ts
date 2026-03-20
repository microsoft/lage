import path from "path";
import { createDefaultConfig } from "backfill-config";
import { setupFixture } from "@lage-run/test-utilities";
import { fetch, put, makeLogger } from "../api.js";

describe("api", () => {
  it("fetch works with custom providers", async () => {
    const packageRoot = await setupFixture("basic");

    const logger = makeLogger("silly", process.stdout, process.stderr);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn().mockResolvedValue(true),
      put: jest.fn().mockResolvedValue(true),
    };

    config.cacheStorageConfig = {
      provider: () => provider,
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
    const packageRoot = await setupFixture("basic");

    const logger = makeLogger("silly", process.stdout, process.stderr);
    const config = createDefaultConfig(packageRoot);
    const provider = {
      fetch: jest.fn().mockResolvedValue(true),
      put: jest.fn().mockResolvedValue(true),
    };

    config.cacheStorageConfig = {
      provider: () => provider,
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
