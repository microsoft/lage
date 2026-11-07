let cachingEnabled = true;

/** Enable or disable caching for all utilities that support caching */
export function setCachingEnabled(enabled: boolean): void {
  cachingEnabled = enabled;
}

export function isCachingEnabled(): boolean {
  return cachingEnabled;
}
