import { nameAtVersion } from "./nameAtVersion.js";
import { type LockDependency, type ParsedLock, type PnpmLockFile } from "./types.js";

/**
 * Remove the trailing peer-dependency and/or patch-hash suffix(es) from a pnpm version string,
 * e.g. `1.0.0(react@18.0.0)`, `1.0.0(patch_hash=abc)`, `1.0.0(patch_hash=abc)(react@18.0.0)`, or
 * nested groups like `1.0.0(react-dom@18(react@18))`.
 *
 * Mirrors `indexOfDepPathSuffix` from pnpm's `@pnpm/deps.path`: it walks the string from the end,
 * counting balanced parentheses, so suffix groups are stripped even when a peer suffix itself
 * contains nested parentheses. Versions without a trailing suffix (the common case) are returned
 * unchanged, including non-semver versions such as tarball or git URLs.
 */
function stripPeerAndPatchSuffix(version: string): string {
  if (!version.endsWith(")")) {
    return version;
  }

  let open = 1;
  for (let i = version.length - 2; i >= 0; i--) {
    const char = version[i];
    if (char === "(") {
      open--;
    } else if (char === ")") {
      open++;
    } else if (open === 0) {
      // First non-paren character (scanning from the right) that sits outside all suffix groups:
      // everything after it is the peer/patch suffix.
      return version.slice(0, i + 1);
    }
  }

  return version;
}

/**
 * Parse a pnpm package/snapshot key into its name and version, handling every lockfile format:
 * - lockfileVersion <= 5.x: slash-separated, e.g. `/which/2.0.2` or `/@babel/runtime/7.28.4`
 * - lockfileVersion 6.0: leading slash with `@` separator, e.g. `/which@2.0.2`, plus peer/patch
 *   suffixes like `/react-dom@18.3.1(react@18.3.1)` and `/is-odd@3.0.1(patch_hash=...)`
 * - lockfileVersion >= 9.0: no leading slash, e.g. `which@2.0.2`, with the same suffixes and
 *   nested peer groups, e.g. `@testing-library/react@16.0.1(react-dom@18.3.1(react@18.3.1))(react@18.3.1)`
 *
 * The name/version separator is the first `@` at index >= 1 (mirroring pnpm's `parse`), so the
 * leading `@` of a scoped package is ignored and an `@` inside a non-semver version (e.g. a
 * `git+ssh://git@host/...` URL) is not mistaken for the separator.
 */
function parsePackageKey(key: string): { name: string; version: string } {
  // Strip the leading "/" present in lockfileVersion <= 6.0 keys.
  const base = key.startsWith("/") ? key.slice(1) : key;

  const separatorIndex = base.indexOf("@", 1);
  if (separatorIndex !== -1) {
    return {
      name: base.slice(0, separatorIndex),
      version: stripPeerAndPatchSuffix(base.slice(separatorIndex + 1)),
    };
  }

  // No "@" separator: either a lockfileVersion <= 5.x slash-separated key (`name/version`,
  // `@scope/name/version`) or a 6.0-era git key (`github.com/owner/repo/ref`). Split on the
  // last "/" so the final segment is treated as the version.
  const stripped = stripPeerAndPatchSuffix(base);
  const slashIndex = stripped.lastIndexOf("/");
  if (slashIndex === -1) {
    return { name: stripped, version: "" };
  }
  return {
    name: stripped.slice(0, slashIndex),
    version: stripped.slice(slashIndex + 1),
  };
}

export function parsePnpmLock(yaml: PnpmLockFile): ParsedLock {
  const object: {
    [key in string]: LockDependency;
  } = {};

  // lockfileVersion >= 9.0 moves dependency edges into a `snapshots` section, leaving `packages`
  // with only resolution metadata. Earlier versions keep dependencies inline under `packages`.
  const entries = yaml?.snapshots ?? yaml?.packages;

  if (entries) {
    for (const [pkgSpec, snapshot] of Object.entries(entries)) {
      // TODO: handle file:foo.tgz syntax (rush uses this for internal package links)
      const { name, version } = parsePackageKey(pkgSpec);

      object[nameAtVersion(name, version)] = {
        version,
        dependencies: snapshot?.dependencies,
      };
    }
  }

  return {
    object,
    type: "success",
  };
}
