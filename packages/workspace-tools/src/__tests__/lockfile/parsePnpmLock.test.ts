import { describe, expect, it } from "@jest/globals";
import { parsePnpmLock } from "../../lockfile/parsePnpmLock.js";
import type { PnpmLockFile } from "../../lockfile/types.js";

/**
 * Direct unit tests for the pnpm dependency-path key parsing in `parsePnpmLock`. These use
 * hand-crafted lockfile objects to exercise edge cases that are awkward to reproduce as real
 * fixtures (e.g. `git+ssh://` URLs that require network/auth to resolve).
 *
 * The expected behavior for lockfileVersion 6.0 / 9.0 mirrors pnpm's own `parse` /
 * `indexOfDepPathSuffix` in `@pnpm/deps.path`: the name/version separator is the first `@` at
 * index >= 1, and trailing peer-dependency and patch-hash suffixes are removed by
 * balanced-parenthesis matching.
 */
describe("parsePnpmLock", () => {
  describe("lockfileVersion >= 9.0 (snapshots section)", () => {
    it("reads dependency edges from `snapshots`, not `packages`", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        packages: { "which@2.0.2": { resolution: { integrity: "sha512-..." } } },
        snapshots: { "which@2.0.2": { dependencies: { isexe: "2.0.0" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["which@2.0.2"]).toEqual({ version: "2.0.2", dependencies: { isexe: "2.0.0" } });
    });

    it("ignores the scoped leading `@` when splitting name and version", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { "@babel/runtime@7.28.4": { dependencies: { "regenerator-runtime": "0.14.1" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["@babel/runtime@7.28.4"]).toEqual({
        version: "7.28.4",
        dependencies: { "regenerator-runtime": "0.14.1" },
      });
    });

    it("strips a single peer-dependency suffix", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { "react-dom@18.3.1(react@18.3.1)": { dependencies: { react: "18.3.1" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["react-dom@18.3.1"]).toEqual({ version: "18.3.1", dependencies: { react: "18.3.1" } });
    });

    it("strips multiple peer-dependency suffixes", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { "foo@1.0.0(react@18.0.0)(react-dom@18.0.0)": { dependencies: {} } },
      };

      const { object } = parsePnpmLock(lock);
      expect(Object.keys(object)).toEqual(["foo@1.0.0"]);
      expect(object["foo@1.0.0"].version).toBe("1.0.0");
    });

    it("strips nested peer-dependency suffixes", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: {
          "@testing-library/react@16.0.1(react-dom@18.3.1(react@18.3.1))(react@18.3.1)": {
            dependencies: { "react-dom": "18.3.1" },
          },
        },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["@testing-library/react@16.0.1"]).toEqual({
        version: "16.0.1",
        dependencies: { "react-dom": "18.3.1" },
      });
    });

    it("strips a patch_hash suffix", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { "is-odd@3.0.1(patch_hash=abc123)": { dependencies: { "is-number": "6.0.0" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["is-odd@3.0.1"]).toEqual({ version: "3.0.1", dependencies: { "is-number": "6.0.0" } });
    });

    it("strips a combined patch_hash and peer suffix", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { "foo@1.0.0(patch_hash=abc123)(react@18.0.0)": { dependencies: {} } },
      };

      const { object } = parsePnpmLock(lock);
      expect(Object.keys(object)).toEqual(["foo@1.0.0"]);
      expect(object["foo@1.0.0"].version).toBe("1.0.0");
    });

    it("keeps a non-semver tarball URL version verbatim", () => {
      const url = "https://codeload.github.com/kevva/is-positive/tar.gz/97edff6f";
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { [`is-positive@${url}`]: {} },
      };

      const { object } = parsePnpmLock(lock);
      expect(object[`is-positive@${url}`]).toEqual({ version: url, dependencies: undefined });
    });

    it("splits on the first `@` for a non-semver version that itself contains `@`", () => {
      // A `git+ssh://git@github.com/...` URL contains an `@`; the separator must be the first `@`
      // after the name, not the last (which would corrupt both the name and the version).
      const version = "git+ssh://git@github.com/sindresorhus/is-plain-obj.git#abc123";
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { [`is-plain-obj@${version}`]: { dependencies: {} } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object[`is-plain-obj@${version}`]).toBeTruthy();
      expect(object[`is-plain-obj@${version}`].version).toBe(version);
    });

    it("does not strip parentheses that are not a trailing suffix", () => {
      // Suffix stripping only applies to balanced groups at the very end of the version, so a
      // non-semver version that merely contains `(` is kept intact (mirrors pnpm only acting when
      // the version ends with `)`).
      const version = "https://example.com/pkg(beta).tgz";
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        snapshots: { [`pkg@${version}`]: {} },
      };

      const { object } = parsePnpmLock(lock);
      expect(object[`pkg@${version}`].version).toBe(version);
    });
  });

  describe("lockfileVersion 6.0 (leading slash, dependencies inline in packages)", () => {
    it("strips the leading slash and splits on `@`", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "6.0",
        packages: { "/which@2.0.2": { dependencies: { isexe: "2.0.0" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["which@2.0.2"]).toEqual({ version: "2.0.2", dependencies: { isexe: "2.0.0" } });
    });

    it("handles a scoped name with a leading slash and peer suffix", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "6.0",
        packages: { "/@testing-library/react@16.0.1(react@18.3.1)": { dependencies: { react: "18.3.1" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["@testing-library/react@16.0.1"]).toEqual({
        version: "16.0.1",
        dependencies: { react: "18.3.1" },
      });
    });

    it("parses the git dependency encoding `github.com/owner/repo/ref`", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "6.0",
        packages: { "github.com/kevva/is-positive/97edff6f": {} },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["github.com/kevva/is-positive@97edff6f"]).toEqual({
        version: "97edff6f",
        dependencies: undefined,
      });
    });
  });

  describe("lockfileVersion <= 5.x (slash-separated keys)", () => {
    it("splits an unscoped `/name/version` key", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: 5.4,
        packages: { "/which/2.0.2": { dependencies: { isexe: "2.0.0" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["which@2.0.2"]).toEqual({ version: "2.0.2", dependencies: { isexe: "2.0.0" } });
    });

    it("splits a scoped `/@scope/name/version` key", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: 5.4,
        packages: { "/@babel/runtime/7.28.4": { dependencies: {} } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["@babel/runtime@7.28.4"]).toEqual({ version: "7.28.4", dependencies: {} });
    });
  });

  describe("degenerate input", () => {
    it("returns an empty object when there are no packages or snapshots", () => {
      expect(parsePnpmLock({} as PnpmLockFile).object).toEqual({});
    });

    it("prefers `snapshots` over `packages` when both are present", () => {
      const lock: PnpmLockFile = {
        lockfileVersion: "9.0",
        packages: { "foo@1.0.0": { dependencies: { fromPackages: "1.0.0" } } },
        snapshots: { "foo@1.0.0": { dependencies: { fromSnapshots: "1.0.0" } } },
      };

      const { object } = parsePnpmLock(lock);
      expect(object["foo@1.0.0"].dependencies).toEqual({ fromSnapshots: "1.0.0" });
    });
  });
});
