import type { LockDependency, ParsedLock, BerryLockFile } from "./types.js";

/**
 * Convert a Yarn Berry (v2+) YAML lock file contents into a standardized format.
 */
export function parseBerryLock(yaml: BerryLockFile): ParsedLock {
  const results: { [key: string]: LockDependency } = {};

  if (yaml) {
    for (const [keySpec, descriptor] of Object.entries(yaml)) {
      if (keySpec === "__metadata") {
        continue;
      }

      const keys = keySpec.split(", ");

      for (const key of keys) {
        const normalizedKey = normalizeKey(key);
        results[normalizedKey] = {
          version: descriptor.version,
          dependencies: descriptor.dependencies ?? {},
        };
      }
    }
  }

  return {
    object: results,
    type: "success",
  };
}

// normalizes the version range as a key lookup
function normalizeKey(key: string): string {
  if (key.includes("npm:")) {
    return key.replace(/npm:/, "");
  }

  return key;
}
