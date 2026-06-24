import { nameAtVersion } from "./nameAtVersion.js";
import { type LockDependency, type ParsedLock, type PnpmLockFile } from "./types.js";

export function parsePnpmLock(yaml: PnpmLockFile): ParsedLock {
  const object: {
    [key in string]: LockDependency;
  } = {};

  // lockfileVersion 6.0 introduced the `name@version` dependency-path format (and 9.0 additionally
  // moved dependency edges into a `snapshots` section). Older lockfiles (5.x and below) use the
  // original slash-separated `name/version` format, which is parsed by the legacy branch below.
  const lockfileVersion = Number(yaml?.lockfileVersion ?? 0);

  if (lockfileVersion >= 6) {
    // lockfileVersion >= 9.0 stores dependency edges under `snapshots`; 6.0 keeps them inline in
    // `packages`. Either way the keys share the same `name@version(suffixes)` format.
    const entries = yaml.snapshots ?? yaml.packages;
    for (const [pkgSpec, snapshot] of Object.entries(entries ?? {})) {
      const { name, version } = parsePackageKey(pkgSpec, snapshot ?? {});
      object[nameAtVersion(name, version)] = {
        version,
        dependencies: snapshot?.dependencies,
      };
    }
  } else if (yaml?.packages) {
    for (const [pkgSpec, snapshot] of Object.entries(yaml.packages)) {
      // TODO: handle file:foo.tgz syntax (rush uses this for internal package links)
      const specParts = pkgSpec.split(/\//);
      const name = specParts.length > 3 ? `${specParts[1]}/${specParts[2]}` : specParts[1];
      const version = specParts.length > 3 ? specParts[3] : specParts[2];

      object[nameAtVersion(name, version)] = {
        version,
        dependencies: snapshot.dependencies,
      };
    }
  }

  return {
    object,
    type: "success",
  };
}

/**
 * Parse a lockfileVersion 6.0 / 9.0 package or snapshot key into its name and version. Keys may
 * have a leading `/` (6.0) and trailing peer/patch suffixes, e.g.:
 * - `/react-dom@18.3.1(react@18.3.1)`
 * - `is-odd@3.0.1(patch_hash=...)`
 * - `@testing-library/react@16.0.1(react-dom@18.3.1(react@18.3.1))(react@18.3.1)`
 * - `github.com/owner/repo/<ref>` (a 6.0 git dependency, which has no `name@version` form)
 *
 * The name/version separator is the first `@` after the package name, so scoped package names and
 * non-semver versions containing `@` (e.g. a `git+ssh://git@host/...` URL) are handled correctly.
 *
 * This intentionally does not handle pnpm <= 5.x `/name/version` keys; those are parsed by the
 * legacy branch in `parsePnpmLock`.
 *
 * @param key A pnpm 6/9 `packages` or `snapshots` map key.
 * @param entry The corresponding lockfile entry; `entry.name` is the fallback name for keys with no
 *   `name@version` form (pnpm writes `name` onto the entry because it cannot be derived from the key).
 */
function parsePackageKey(key: string, entry: { name?: string }): { name: string; version: string } {
  // 6.0 keys have a leading "/"; 9.0 keys do not.
  const base = key.startsWith("/") ? key.slice(1) : key;

  const separatorIndex = base.indexOf("@", 1);
  if (separatorIndex === -1) {
    // No `name@version` form (e.g. a git dependency): the key itself is the version.
    return { name: entry.name ?? base, version: base };
  }

  return {
    name: base.slice(0, separatorIndex),
    version: stripPeerAndPatchSuffix(base.slice(separatorIndex + 1)),
  };
}

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
