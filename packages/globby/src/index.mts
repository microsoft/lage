import { globby, globbySync, type Options } from "globby";

const cache = new Map<string, string[]>();

function cacheKey(patterns: string[], options: Options = {}) {
  return JSON.stringify({ patterns, options });
}

export async function globAsync(patterns: string[], options?: Options): Promise<string[]> {
  const key = cacheKey(patterns, options);
  if (!cache.has(key)) {
    cache.set(key, await globby(patterns, options));
  }
  return cache.get(key) || [];
}

export function glob(patterns: string[], options?: Options): string[] {
  const key = cacheKey(patterns, options);
  if (!cache.has(key)) {
    cache.set(key, globbySync(patterns, options));
  }
  return cache.get(key) || [];
}

/**
 * Uncached variants — use these when the file system may change between calls
 * (e.g. cache storage collecting build outputs after a task runs).
 */
export async function globAsyncUncached(patterns: string[], options?: Options): Promise<string[]> {
  return globby(patterns, options);
}

export function globUncached(patterns: string[], options?: Options): string[] {
  return globbySync(patterns, options);
}

export type { Options };
