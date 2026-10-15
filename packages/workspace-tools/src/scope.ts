import micromatch from "micromatch";

/**
 * Get package names that are in-scope for an operation, based on the provided search patterns.
 * Negations are supported.
 *
 * Patterns that don't start with `@` or `!@` are considered "bare" package names, and will match
 * any `@scoped` package with a matching basename.
 */
export function getScopedPackages(search: string[], packages: { [pkg: string]: unknown } | string[]): string[] {
  const packageNames = Array.isArray(packages) ? packages : Object.keys(packages);

  const results = new Set<string>();

  // perform a package-scoped search (e.g. search is @scope/foo*)
  const scopedSearch = search.filter((needle) => needle.startsWith("@") || needle.startsWith("!@"));
  if (scopedSearch.length > 0) {
    const matched = micromatch(packageNames, scopedSearch, { nocase: true });
    for (const pkg of matched) {
      results.add(pkg);
    }
  }

  // perform a package-unscoped search (e.g. search is foo*)
  const unscopedSearch = search.filter((needle) => !needle.startsWith("@") && !needle.startsWith("!@"));
  if (unscopedSearch.length > 0) {
    // only generate the bare package map if there ARE unscoped searches
    const barePackageMap = generateBarePackageMap(packageNames);

    const matched = micromatch(Object.keys(barePackageMap), unscopedSearch, { nocase: true });
    for (const bare of matched) {
      for (const pkg of barePackageMap[bare]) {
        results.add(pkg);
      }
    }
  }

  return [...results];
}

function generateBarePackageMap(packageNames: string[]) {
  const barePackageMap: { [key: string]: string[] } = {};

  // create a map of bare package name -> list of full package names
  // NOTE: do not perform barePackageMap lookup if any of the "scopes" arg starts with "@"
  for (const pkg of packageNames) {
    const bare = pkg.replace(/^@[^/]+\//, "");
    barePackageMap[bare] = barePackageMap[bare] || [];
    barePackageMap[bare].push(pkg);
  }

  return barePackageMap;
}
