import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import path from "path";
import { getPackageInfo, getPackageInfoAsync } from "../getPackageInfo.js";
import { cleanupFixtures, setupFixture, setupPackageJson } from "./setupFixture.js";

let root: string;
let packageJsonPath: string;
beforeEach(() => {
  root = setupFixture();
  packageJsonPath = path.join(root, "package.json");
  jest.replaceProperty(process, "env", { ...process.env, VERBOSE: "1" });
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});
afterAll(cleanupFixtures);

describe.each(["sync", "async"] as const)("getPackageInfo (%s)", (syncAsync) => {
  const getInfo = syncAsync === "sync" ? getPackageInfo : getPackageInfoAsync;
  it("reads a manifest without a separate existence check", async () => {
    setupPackageJson(root, { name: "package", scripts: { build: "build" }, packageJsonPath: "ignored" });
    const exists = jest.spyOn(fs, "existsSync");

    expect(await getInfo(root)).toEqual({ name: "package", scripts: { build: "build" }, packageJsonPath });
    expect(exists).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("reports a missing manifest without throwing", async () => {
    expect(await getInfo(root)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(`File does not exist: ${packageJsonPath}`, "");
  });

  it("logs invalid JSON rather than throwing", async () => {
    fs.writeFileSync(packageJsonPath, "{");

    expect(await getInfo(root)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Error reading or parsing ${packageJsonPath}:`),
      ""
    );
  });
});
