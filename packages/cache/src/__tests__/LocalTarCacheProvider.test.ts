import createLogger from "@lage-run/logger";
import { Monorepo } from "@lage-run/test-utilities";
import type { Target } from "@lage-run/target-graph";
import path from "path";
import fs from "fs";
import { LocalTarCacheProvider, type LocalTarCacheProviderOptions } from "../providers/LocalTarCacheProvider.js";
import { getCacheDirectoryRoot } from "../getCacheDirectory.js";

describe("LocalTarCacheProvider", () => {
  let monorepo: Monorepo | undefined;

  afterEach(async () => {
    await monorepo?.cleanup();
    monorepo = undefined;
  });

  it("should put outputs into a tar and fetch them back", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("tar-cache-roundtrip");

    await monorepo.init({ packages: { a: {} } });

    const options: LocalTarCacheProviderOptions = {
      logger,
      root: monorepo.root,
      outputGlob: ["output.txt"],
    };

    const provider = new LocalTarCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const hash = "some-hash";

    // Write an output file in the package directory
    monorepo.writeFiles({
      "packages/a/output.txt": "hello from tar cache",
    });

    // Put the output into the cache
    await provider.put(hash, target);

    // Verify the tar file was created
    const tarPath = path.join(getCacheDirectoryRoot(monorepo.root), "cache", hash.substring(0, 4), `${hash}.tar`);
    expect(fs.existsSync(tarPath)).toBe(true);

    // Remove the output file so we can verify fetch restores it
    fs.unlinkSync(path.join(monorepo.root, "packages/a/output.txt"));
    expect(fs.existsSync(path.join(monorepo.root, "packages/a/output.txt"))).toBe(false);

    // Fetch from cache
    const fetchResult = await provider.fetch(hash, target);
    expect(fetchResult).toBe(true);

    // Verify the file was restored
    const contents = monorepo.readFiles(["packages/a/output.txt"]);
    expect(contents["packages/a/output.txt"]).toBe("hello from tar cache");
  });

  it("should return false when cache entry does not exist", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("tar-cache-miss");

    await monorepo.init({ packages: { a: {} } });

    const options: LocalTarCacheProviderOptions = {
      logger,
      root: monorepo.root,
      outputGlob: ["output.txt"],
    };

    const provider = new LocalTarCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "command",
      label: "a - command",
    };

    const fetchResult = await provider.fetch("nonexistent-hash", target);
    expect(fetchResult).toBe(false);
  });

  it("should handle multiple output files in subdirectories", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("tar-cache-multi");

    await monorepo.init({ packages: { a: {} } });

    const options: LocalTarCacheProviderOptions = {
      logger,
      root: monorepo.root,
      outputGlob: ["lib/**/*"],
    };

    const provider = new LocalTarCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "build",
      label: "a - build",
    };

    const hash = "multi-file-hash";

    // Write multiple output files
    monorepo.writeFiles({
      "packages/a/lib/index.js": "module.exports = {};",
      "packages/a/lib/utils/helper.js": "module.exports = { help: true };",
    });

    await provider.put(hash, target);

    // Remove output files
    fs.rmSync(path.join(monorepo.root, "packages/a/lib"), { recursive: true });
    expect(fs.existsSync(path.join(monorepo.root, "packages/a/lib"))).toBe(false);

    // Fetch and verify
    const fetchResult = await provider.fetch(hash, target);
    expect(fetchResult).toBe(true);

    const contents = monorepo.readFiles(["packages/a/lib/index.js", "packages/a/lib/utils/helper.js"]);
    expect(contents["packages/a/lib/index.js"]).toBe("module.exports = {};");
    expect(contents["packages/a/lib/utils/helper.js"]).toBe("module.exports = { help: true };");
  });

  it("should use target.outputs when available", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("tar-cache-target-outputs");

    await monorepo.init({ packages: { a: {} } });

    const options: LocalTarCacheProviderOptions = {
      logger,
      root: monorepo.root,
      outputGlob: ["should-not-match/**/*"],
    };

    const provider = new LocalTarCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "build",
      label: "a - build",
      outputs: ["dist/**/*"],
    };

    const hash = "target-outputs-hash";

    monorepo.writeFiles({
      "packages/a/dist/bundle.js": "console.log('bundled');",
    });

    await provider.put(hash, target);

    fs.rmSync(path.join(monorepo.root, "packages/a/dist"), { recursive: true });

    const fetchResult = await provider.fetch(hash, target);
    expect(fetchResult).toBe(true);

    const contents = monorepo.readFiles(["packages/a/dist/bundle.js"]);
    expect(contents["packages/a/dist/bundle.js"]).toBe("console.log('bundled');");
  });

  it("should skip put when no files match the output glob", async () => {
    const logger = createLogger();
    monorepo = new Monorepo("tar-cache-no-match");

    await monorepo.init({ packages: { a: {} } });

    const options: LocalTarCacheProviderOptions = {
      logger,
      root: monorepo.root,
      outputGlob: ["nonexistent/**/*"],
    };

    const provider = new LocalTarCacheProvider(options);

    const target: Target = {
      id: "a",
      cwd: path.join(monorepo.root, "packages/a"),
      depSpecs: [],
      dependents: [],
      dependencies: [],
      task: "build",
      label: "a - build",
    };

    const hash = "no-match-hash";
    await provider.put(hash, target);

    const tarPath = path.join(getCacheDirectoryRoot(monorepo.root), "cache", hash.substring(0, 4), `${hash}.tar`);
    expect(fs.existsSync(tarPath)).toBe(false);
  });
});
