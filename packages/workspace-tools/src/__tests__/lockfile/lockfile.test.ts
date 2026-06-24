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

      // The parsed entry should preserve the resolved version.
      expect(which).toBe("which@2.0.2");
      expect(parsedLockFile.object[which!].version).toBe("2.0.2");
    });

    // The `basic-pnpm-6` (lockfileVersion 6.0) and `basic-pnpm-9` (lockfileVersion 9.0) fixtures
    // contain the same edge-case dependencies so we can verify pnpm dependency-path parsing:
    // - scoped names (`@scope/name@version`)
    // - a single peer-dependency suffix (`react-dom@<v>(react@<v>)`)
    // - multiple/nested peer suffixes (`@testing-library/react@<v>(...)(...)(...)`)
    // - a patched dependency (`is-odd@<v>(patch_hash=...)`)
    // - a non-semver (git/tarball) version
    describe.each(["basic-pnpm-6", "basic-pnpm-9"] as const)("edge cases (%s)", (fixtureName) => {
      it("keeps a plain transitive dependency and its version", async () => {
        const packageRoot = setupFixture(fixtureName);
        const { object } = await parseLockFile(packageRoot);

        const which = Object.keys(object).find((key) => /^which@/.test(key));
        expect(which).toBe("which@2.0.2");
        expect(object[which!].version).toBe("2.0.2");
        expect(object[which!].dependencies?.["isexe"]).toBe("2.0.0");
      });

      it("strips a single peer-dependency suffix from the version", async () => {
        const packageRoot = setupFixture(fixtureName);
        const { object } = await parseLockFile(packageRoot);

        // Snapshot key is `react-dom@18.3.1(react@18.3.1)`; the peer suffix must not leak into
        // the parsed name or version.
        expect(object["react-dom@18.3.1"]).toBeTruthy();
        expect(object["react-dom@18.3.1"].version).toBe("18.3.1");
        expect(object["react-dom@18.3.1"].dependencies?.["react"]).toBe("18.3.1");

        // No parsed key should still contain a raw peer suffix.
        expect(Object.keys(object).some((key) => key.includes("("))).toBe(false);
      });

      it("strips multiple/nested peer suffixes from a scoped package", async () => {
        const packageRoot = setupFixture(fixtureName);
        const { object } = await parseLockFile(packageRoot);

        // Snapshot key has several peer groups (nested in 9.0):
        // `@testing-library/react@16.0.1(@testing-library/dom@10.4.1)(react-dom@18.3.1(react@18.3.1))(react@18.3.1)`
        const key = "@testing-library/react@16.0.1";
        expect(object[key]).toBeTruthy();
        expect(object[key].version).toBe("16.0.1");
        // The peer suffix is stripped from the parsed KEY, but dependency *values* are kept
        // verbatim from the snapshot (they may still carry their own peer suffix).
        expect(object[key].dependencies?.["react-dom"]).toBe("18.3.1(react@18.3.1)");
      });

      it("strips a patch_hash suffix from the version", async () => {
        const packageRoot = setupFixture(fixtureName);
        const { object } = await parseLockFile(packageRoot);

        // Snapshot key is `is-odd@3.0.1(patch_hash=...)`.
        expect(object["is-odd@3.0.1"]).toBeTruthy();
        expect(object["is-odd@3.0.1"].version).toBe("3.0.1");
        expect(object["is-odd@3.0.1"].dependencies?.["is-number"]).toBe("6.0.0");
        expect(Object.keys(object).some((key) => key.includes("patch_hash"))).toBe(false);
      });

      it("keeps a non-semver git dependency version verbatim, keyed by package name", async () => {
        const packageRoot = setupFixture(fixtureName);
        const { object } = await parseLockFile(packageRoot);

        // Both lockfile versions key the parsed entry by the real package name (`is-positive`) with
        // the git resolution descriptor preserved verbatim as the version. In 9.0 the name comes
        // from the `name@<url>` key; in 6.0 the key has no `@` so the name comes from the entry's
        // `name` field and the whole key is preserved as the version.
        const versionByFixture = {
          "basic-pnpm-9": "https://codeload.github.com/kevva/is-positive/tar.gz/97edff6f525f192a3f83cea1944765f769ae2678",
          "basic-pnpm-6": "github.com/kevva/is-positive/97edff6f525f192a3f83cea1944765f769ae2678",
        };
        const version = versionByFixture[fixtureName];

        expect(object[`is-positive@${version}`]).toBeTruthy();
        expect(object[`is-positive@${version}`].version).toBe(version);
      });
    });
  });
});
