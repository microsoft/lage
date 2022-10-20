import { createBackfillLogger } from "./backfillWrapper";
import { Hasher as BackfillHasher } from "backfill-hasher";
import { salt } from "./salt";
import type { Logger as BackfillLogger } from "backfill-logger";
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
  private backfillLogger: BackfillLogger;

  constructor(private options: TargetHasherOptions) {
    this.backfillLogger = createBackfillLogger();
  }

  async hash(target: Target): Promise<string> {
    const hashKey = await salt(
      target.environmentGlob ?? this.options.environmentGlob ?? ["lage.config.js"],
      `${target.id}|${JSON.stringify(this.options.cliArgs)}`,
      this.options.root,
      this.options.cacheKey || ""
    );
    const hasher = new BackfillHasher({ packageRoot: target.cwd }, this.backfillLogger);
    return hasher.createPackageHash(hashKey);
  }
}
