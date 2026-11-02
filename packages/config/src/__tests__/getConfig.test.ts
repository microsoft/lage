import { afterEach, describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { getConfig } from "../getConfig.js";

describe("getConfig", () => {
  const fixtureRoots: string[] = [];
  let fixtureNumber = 0;

  function setupConfigFixture(name: string, experimentalCacheHitOptimization?: boolean | string): string {
    const root = path.join(__dirname, "fixtures", `getConfig-${process.pid}-${fixtureNumber++}`);
    fixtureRoots.push(root);
    fs.cpSync(path.join(__dirname, "fixtures", name), root, { recursive: true });
    // Keep workspace discovery from loading the repository's real config.
    fs.writeFileSync(path.join(root, "yarn.lock"), "");
    if (experimentalCacheHitOptimization !== undefined) {
      fs.appendFileSync(
        path.join(root, "lage.config.js"),
        `\nmodule.exports.experimentalCacheHitOptimization = ${JSON.stringify(experimentalCacheHitOptimization)};\n`
      );
    }
    return root;
  }

  afterEach(() => {
    for (const root of fixtureRoots.splice(0)) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("should read from an asynchronous config file", async () => {
    const config = await getConfig(setupConfigFixture("async-config"));
    expect(config.pipeline).toBeTruthy();
  });

  it("should read from an synchronous config file", async () => {
    const config = await getConfig(setupConfigFixture("sync-config"));
    expect(config.pipeline).toBeTruthy();
  });

  it.each([undefined, false, true])("reads experimentalCacheHitOptimization %s with a false default", async (value) => {
    const config = await getConfig(setupConfigFixture("sync-config", value));
    expect(config.experimentalCacheHitOptimization).toBe(value ?? false);
  });

  it("rejects a non-boolean experimentalCacheHitOptimization value", async () => {
    await expect(getConfig(setupConfigFixture("sync-config", "true"))).rejects.toThrow(
      "experimentalCacheHitOptimization must be a boolean"
    );
  });
});
