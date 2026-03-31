import globby, { type GlobbyOptions as Options } from "globby";

const cache = new Map<string, string[]>();

function cacheKey(patterns: string[], options: Options = {}) {
  return JSON.stringify({ patterns, options });
}

export async function globAsyncCached(patterns: string[], options?: Options): Promise<string[]> {
  const key = cacheKey(patterns, options);
  if (!cache.has(key)) {
    cache.set(key, await globby(patterns, options));
  }
  return cache.get(key) || [];
}
