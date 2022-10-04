import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import type { CacheProvider } from "@lage-run/cache";
import type { Target } from "@lage-run/target-graph";
import cache from "@actions/cache";

const rmdir = promisify(fs.rmdir);
const rm = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const MS_IN_A_DAY = 1000 * 60 * 60 * 24;

export interface GithubActionsCacheProviderOptions {
  root: string;
  cacheOptions: Partial<CacheProvider>;
}

export class GithubActionsCacheProvider implements CacheProvider {
  constructor(private options: GithubActionsCacheProviderOptions) {}

  async fetch(hash: string, target: Target): Promise<boolean> {
    const { root } = this.options;

    if (!hash) {
      return false;
    }

    const paths = target.options?.outputs.map((output) => path.join(root, target.cwd, output));

    const restoreKeys = [target.id];

    const cacheKey = await cache.restoreCache(paths, hash, restoreKeys);

    return !!cacheKey;
  }

  async put(hash: string, target: Target): Promise<void> {
    const { root } = this.options;

    if (!hash) {
      return;
    }

    const paths = target.options?.outputs.map((output) => path.join(root, target.cwd, output));

    await cache.saveCache(paths, hash);
  }

  async clear(): Promise<void> {
    // pass
  }

  async purge(sinceDays: number): Promise<void> {
    // pass
  }
}
