import fs from "fs";
import path from "path";
import { setupFixture, removeTempDir } from "@lage-run/test-utilities";
import { makeLogger } from "backfill-logger";
import {
  createConfig,
  createDefaultConfig,
  getName,
  getSearchPaths,
} from "../createConfig.js";

describe("getName()", () => {
  let packageRoot = "";

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  it("get the name of the package", () => {
    packageRoot = setupFixture("basic");
    const packageName = getName(packageRoot);

    expect(packageName).toBe("basic");
  });
});

describe("getSearchPaths()", () => {
  let packageRoot = "";

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  it("finds all instances of backfill.config.js", () => {
    packageRoot = setupFixture("config");

    const pathPackage1 = path.join(packageRoot, "packages/package-1");
    const searchPathsFromPackage1 = getSearchPaths(pathPackage1);

    const pathPackage2 = path.join(packageRoot, "packages/package-2");
    const searchPathsFromPackage2 = getSearchPaths(pathPackage2);

    expect(searchPathsFromPackage1).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
      path.join(packageRoot, "packages/package-1/backfill.config.js"),
    ]);
    expect(searchPathsFromPackage2).toStrictEqual([
      path.join(packageRoot, "backfill.config.js"),
    ]);
  });

  it("returns empty list when no backfill.config.js can be found", () => {
    packageRoot = setupFixture("basic");
    const searchPaths = getSearchPaths(packageRoot);

    expect(searchPaths).toStrictEqual([]);
  });
});

describe("createConfig()", () => {
  const originalEnv = process.env;
  const logger = makeLogger("info");
  let packageRoot = "";

  beforeAll(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    packageRoot && removeTempDir(packageRoot);
    packageRoot = "";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns default config values when no config file and no env override is provided", () => {
    packageRoot = setupFixture("basic");
    const config = createConfig(logger, packageRoot);

    const defaultLocalCacheFolder =
      createDefaultConfig(packageRoot).internalCacheFolder;
    expect(config.internalCacheFolder).toStrictEqual(defaultLocalCacheFolder);
  });

  it("returns config file value when config file is provided, and no env override", () => {
    packageRoot = setupFixture("config");
    const config = createConfig(logger, packageRoot);

    expect(config.internalCacheFolder).toStrictEqual("foo");
    // this one isn't set in the config file, so the default should be used
    expect(config.logLevel).toStrictEqual("info");
  });

  it("returns env override value when env override is provided", () => {
    process.env["BACKFILL_INTERNAL_CACHE_FOLDER"] = "bar";

    packageRoot = setupFixture("config");
    const config = createConfig(logger, packageRoot);

    expect(config.internalCacheFolder).toStrictEqual("bar");
    // this one isn't set in the config file or env, so the default should be used
    expect(config.logLevel).toStrictEqual("info");
  });

  // For some reason, "mode" is the only option that throws if invalid as of writing
  it("throws on an invalid mode", () => {
    packageRoot = setupFixture("config");
    fs.writeFileSync(
      path.join(packageRoot, "backfill.config.js"),
      "module.exports = { mode: 'invalid-mode' };"
    );

    expect(() => createConfig(logger, packageRoot)).toThrow("invalid-mode");
  });

  // This should be removed once more config validation is added in a major version
  it("does not throw on other invalid options", () => {
    packageRoot = setupFixture("config");
    fs.writeFileSync(
      path.join(packageRoot, "backfill.config.js"),
      "module.exports = { logLevel: 'nope', cacheStorageConfig: 'hmm' };"
    );

    const config = createConfig(logger, packageRoot);
    // no validation of these other options
    expect(config.logLevel).toBe("nope");
    expect(config.cacheStorageConfig).toBe("hmm");
  });
});
