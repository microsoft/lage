import { nameAtVersion } from "./nameAtVersion.js";
import { type LockDependency, type ParsedLock } from "./types.js";

export function queryLockFile(name: string, versionRange: string, lock: ParsedLock): LockDependency {
  const versionRangeSignature = nameAtVersion(name, versionRange);
  return lock.object[versionRangeSignature];
}
