import { Hasher as LageHasher } from "@lage-run/hasher";
import { salt } from "./salt.js";
import type { Target } from "@lage-run/target-graph";
import { hashGlobGit } from "glob-hasher";
import { hashStrings } from "./hashStrings.js";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
}

function sortObject<T>(unordered: Record<string, T>): Record<string, T> {
  return Object.keys(unordered)
    .sort((a, b) => a.localeCompare(b))
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});
}

/**
 * TargetHasher is a class that can be used to generate a hash of a target.
 *
 * Currently, it encapsulates the use of `backfill-hasher` to generate a hash.
 */
export class TargetHasher {
  constructor(private options: TargetHasherOptions) {}

  async hash(target: Target): Promise<string> {
    const { root } = this.options;

    const hashKey = await salt(
      target.environmentGlob ?? this.options.environmentGlob ?? ["lage.config.js"],
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.root,
      this.options.cacheKey || ""
    );

    if (target.cwd === root && target.cache) {
      if (!target.inputs) {
        throw new Error("Root-level targets must have `inputs` defined if it has cache enabled.");
      }

      const hashes = hashGlobGit(target.inputs, { cwd: root, gitignore: false }) ?? {};
      const sortedHashMap = sortObject(hashes);
      const sortedHashes = Object.values(sortedHashMap);
      sortedHashes.push(hashKey);

      return hashStrings(sortedHashes);
    }

    const hasher = new LageHasher(target.cwd);
    return hasher.createPackageHash(hashKey);
  }
}
