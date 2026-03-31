import { describe, expect, it } from "@jest/globals";
import fs from "fs";
import path from "path";
import { setupFixture } from "../setupFixture.js";
import { parseLockFile } from "../../lockfile/parseLockFile.js";
import { getPackageInfo } from "../../getPackageInfo.js";

const ERROR_MESSAGES = {
  NO_LOCK: "You do not have yarn.lock, pnpm-lock.yaml or package-lock.json. Please use one of these package managers.",
  UNSUPPORTED:
    "Your package-lock.json version is not supported: lockfileVersion is 1. You need npm version 7 or above and package-lock version 2 or above. Please, upgrade npm or choose a different package manager.",
};

describe("parseLockFile()", () => {
  describe("general", () => {
    it("throws if it cannot find lock file", async () => {
      const packageRoot = setupFixture("basic-without-lock-file");

      await expect(parseLockFile(packageRoot)).rejects.toThrow(ERROR_MESSAGES.NO_LOCK);
    });
  });

  describe("NPM", () => {
    it("parses package-lock.json file when it is found", async () => {
      const packageRoot = setupFixture("monorepo-basic-npm");
      const parsedLockFile = await parseLockFile(packageRoot);

      expect(parsedLockFile).toHaveProperty("type", "success");
    });

    it("throws if npm version is unsupported", async () => {
      const packageRoot = setupFixture("monorepo-npm-unsupported");

      await expect(parseLockFile(packageRoot)).rejects.toThrow(ERROR_MESSAGES.UNSUPPORTED);
    });
  });

  describe.each([1, "berry"] as const)("yarn %s", (yarnVersion) => {
    it("parses yarn.lock file when it is found", async () => {
      const packageRoot = setupFixture(`basic-yarn-${yarnVersion}`);
      const parsedLockFile = await parseLockFile(packageRoot);

      expect(parsedLockFile).toHaveProperty("type", "success");
    });

    it("parses combined ranges in yarn.lock", async () => {
      const packageRoot = setupFixture(`extra-yarn-${yarnVersion}`);

      // Verify that __fixtures__/extra-yarn-* still follows these assumptions:
      // - "execa" is listed as a dep in package.json
      // - "@types/execa" is also listed as a dep, and internally has a dep on "execa@*"
      const depName = "execa";
      const packageInfo = getPackageInfo(packageRoot)!;
      const depRange = packageInfo.dependencies?.[depName];
      expect(depRange).toBeTruthy();
      expect(packageInfo.devDependencies?.[`@types/${depName}`]).toBeTruthy();

      const depSpec = `${depName}@${depRange}`;
      const extraSpec = `${depName}@*`;
      const combinedResolution = `${extraSpec}, ${depSpec}`;
      const lockContent = fs.readFileSync(path.join(packageRoot, "yarn.lock"), "utf8");
      // If this fails, an update to the fixture has probably resolved execa@* to a separate version.
      // To fix, combine the resolutions in the lock file and re-run yarn.
      expect(lockContent).toContain(yarnVersion === 1 ? combinedResolution : combinedResolution.replace(/@/g, "@npm:"));

      // The actual test: execa@* resolves to the same thing as execa@<specific version from package.json>
      const parsedLockFile = await parseLockFile(packageRoot);
      // Two separate entries
      const resolvedDep = parsedLockFile.object[depSpec];
      expect(resolvedDep).toBeTruthy();
      const resolvedExtra = parsedLockFile.object[extraSpec];
      expect(resolvedExtra).toBeTruthy();
      // Resolved to the same version
      expect(resolvedExtra).toEqual(resolvedDep);
    });
  });

  describe("PNPM", () => {
    it("parses pnpm-lock.yaml file when it is found", async () => {
      const packageRoot = setupFixture("basic-pnpm");
      const parsedLockFile = await parseLockFile(packageRoot);

      // If the lock file is updated, you might need to switch to a different key and dependency
      const which = Object.keys(parsedLockFile.object).find((key) => /^which@/.test(key));
      expect(which).toBeTruthy();
      expect(parsedLockFile.object[which!].dependencies?.["isexe"]).toBeTruthy();
    });
  });
});
