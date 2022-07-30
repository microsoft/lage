import type { Target } from "@lage-run/target-graph";

export interface CacheProvider {
  hash(target: Target, args: any): Promise<string>;
  fetch(hash: string, target: Target): Promise<boolean>;
  put(hash: string, target: Target): Promise<void>;
  clear(): Promise<void>;
  purge(sinceDays: number): Promise<void>;
}
