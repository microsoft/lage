import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { getPackageInfo, getPackageInfoAsync } from "../getPackageInfo.js";
import { cleanupFixtures, setupFixture } from "./setupFixture.js";

describe.each([
  ["sync", getPackageInfo],
  ["async", getPackageInfoAsync],
] as const)("getPackageInfo (%s)", (mode, readPackage) => {
  const originalVerbose = process.env.VERBOSE;
  let cwd: string;
  let packageJsonPath: string;

  beforeEach(() => {
    cwd = setupFixture();
    packageJsonPath = path.join(cwd, "package.json");
    process.env.VERBOSE = "1";
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalVerbose === undefined) {
      delete process.env.VERBOSE;
    } else {
      process.env.VERBOSE = originalVerbose;
    }
  });

  afterAll(cleanupFixtures);

  it("reads metadata without a preliminary existence check", async () => {
    const metadata = { name: "example", version: "1.0.0", dependencies: { dependency: "^2.0.0" } };
    fs.writeFileSync(packageJsonPath, JSON.stringify(metadata));
    const exists = jest.spyOn(fs, "existsSync");

    expect(await readPackage(cwd)).toEqual({ ...metadata, packageJsonPath });
    expect(exists).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("reports missing files", async () => {
    expect(await readPackage(cwd)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(`File does not exist: ${packageJsonPath}`, "");
  });

  it("reports invalid JSON", async () => {
    fs.writeFileSync(packageJsonPath, "{");

    expect(await readPackage(cwd)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Error reading or parsing ${packageJsonPath}:`),
      ""
    );
  });

  it("reports read errors for existing files", async () => {
    fs.writeFileSync(packageJsonPath, "{}");
    const error = new Error("permission denied");
    if (mode === "sync") {
      jest.spyOn(fs, "readFileSync").mockImplementation(() => {
        throw error;
      });
    } else {
      jest.spyOn(fsPromises, "readFile").mockRejectedValue(error);
    }

    expect(await readPackage(cwd)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(`Error reading or parsing ${packageJsonPath}: permission denied`, "");
  });
});
