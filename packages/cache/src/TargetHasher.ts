import { Hasher as LageHasher } from "@lage-run/hasher";
import { salt } from "./salt.js";
import type { Target } from "@lage-run/target-graph";

export interface TargetHasherOptions {
  root: string;
  environmentGlob: string[];
  cacheKey?: string;
  cliArgs?: string[];
}

/**
 * TargetHasher is a class that can be used to generate a hash of a target.
 *
 * Currently, it encapsulates the use of `backfill-hasher` to generate a hash.
 */
export class TargetHasher {
  constructor(private options: TargetHasherOptions) {}

  async hash(target: Target): Promise<string> {
    const hashKey = await salt(
      target.environmentGlob ?? this.options.environmentGlob ?? ["lage.config.js"],
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.root,
      this.options.cacheKey || ""
    );
    const hasher = new LageHasher(target.cwd);
    return hasher.createPackageHash(hashKey);
  }
}
