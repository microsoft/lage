import { nameAtVersion } from "./nameAtVersion.js";
import { type ParsedLock, type NpmLockFile } from "./types.js";

export function parseNpmLock(lock: NpmLockFile): ParsedLock {
  // Re-format the dependencies object so that the key includes the version, similarly to yarn.lock.
  // For example, `"@microsoft/task-scheduler": { }` will become `"@microsoft/task-scheduler@2.7.1": { }`.
  const dependencies = Object.fromEntries(
    Object.entries(lock.dependencies ?? {}).map(([key, dep]) => [nameAtVersion(key, dep.version), dep])
  );

  return {
    object: dependencies,
    type: "success",
  };
}
