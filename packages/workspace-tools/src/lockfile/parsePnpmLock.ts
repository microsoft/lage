import { nameAtVersion } from "./nameAtVersion.js";
import { type LockDependency, type ParsedLock, type PnpmLockFile } from "./types.js";

/**
 * Parse a pnpm package/snapshot key into its name and version, handling every lockfile format:
 * - lockfileVersion <= 5.x: slash-separated, e.g. `/which/2.0.2` or `/@babel/runtime/7.28.4`
 * - lockfileVersion 6.0: leading slash with `@` separator, e.g. `/which@2.0.2` or `/@babel/runtime@7.28.4`
 * - lockfileVersion >= 9.0: no leading slash, e.g. `which@2.0.2` or `@babel/runtime@7.28.4`
 *
 * Any peer-dependency suffix (e.g. `(react@19.2.4)`) is stripped.
 */
function parsePackageKey(key: string): { name: string; version: string } {
  // Strip the leading "/" present in lockfileVersion <= 6.0 keys.
  let base = key.startsWith("/") ? key.slice(1) : key;

  // Strip any peer-dependency suffix, e.g. `(react@19.2.4)`.
  const peerIndex = base.indexOf("(");
  if (peerIndex !== -1) {
    base = base.slice(0, peerIndex);
  }

  // An "@" past the first character separates the version in lockfileVersion >= 6.0
  // (the first character may be the "@" of a scoped package name).
  const atIndex = base.lastIndexOf("@");
  if (atIndex > 0) {
    return { name: base.slice(0, atIndex), version: base.slice(atIndex + 1) };
  }

  // lockfileVersion <= 5.x uses "/" to separate the version.
  const slashIndex = base.lastIndexOf("/");
  return { name: base.slice(0, slashIndex), version: base.slice(slashIndex + 1) };
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
