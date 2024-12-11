import globby, { type GlobbyOptions } from "globby";

const cache = new Map<string, string[]>();

function cacheKey(patterns: string[], options: GlobbyOptions = {}) {
  return JSON.stringify({ patterns, options });
}

export async function globAsync(patterns: string[], options?: GlobbyOptions) {
  const key = cacheKey(patterns, options);
  if (!cache.has(key)) {
    cache.set(key, await globby(patterns, options));
  }
  return cache.get(key) || [];
}

export function glob(patterns: string[], options?: GlobbyOptions) {
  const key = cacheKey(patterns, options);
  if (!cache.has(key)) {
    cache.set(key, globby.sync(patterns, options));
  }
  return cache.get(key) || [];
}

export function globNoCache(patterns: string[], options?: GlobbyOptions) {
  return globby.sync(patterns, options);
}

export type { GlobbyOptions as Options };
