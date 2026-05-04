import type { Catalogs } from "../types/Catalogs.js";

const catalogPrefix = "catalog:";

/**
 * Returns true if the version starts with `catalog:`.
 */
export function isCatalogVersion(version: string): boolean {
  return version.startsWith(catalogPrefix);
}

/**
 * Given a dependency package name and a version spec string, if the version starts with `catalog:`,
 * look up the actual version spec (not the final resolved version) from the given catalogs.
 *
 * Throws an error if there's anything invalid about the catalog spec (no catalogs defined,
 * no matching catalog, catalog doesn't contain `name`, recursive catalog version).
 * If `allowNotFound` is true, it will return undefined if no match instead.
 *
 * Returns undefined if the version doesn't start with `catalog:`.
 * @see https://pnpm.io/catalogs
 * @see https://yarnpkg.com/features/catalogs
 *
 * @returns Actual version spec from the catalog, or undefined if not a catalog version
 * (or undefined if `allowNotFound` is true and the package isn't in the catalog)
 */
export function getCatalogVersion(params: {
  /** Dependency package name */
  name: string;
  /**
   * Dependency version spec, e.g. `catalog:my-catalog` or `catalog:`, or some non-catalog
   * spec like `^1.2.3`
   */
  version: string;
  catalogs: Catalogs | undefined;
  allowNotFound?: boolean;
}): string | undefined {
  const { name, version, catalogs, allowNotFound } = params;

  if (!isCatalogVersion(version)) {
    return undefined;
  }

  if (!catalogs) {
    if (allowNotFound) {
      return undefined;
    }
    throw new Error(`Dependency "${name}" uses a catalog version "${version}" but no catalogs are defined.`);
  }

  const catalogName = version.slice(catalogPrefix.length);
  const checkCatalog =
    // Explicit catalog:default refers to the default catalog in pnpm, or a catalog named "default"
    // in yarn... Check for the yarn case first or fall back to .default. (getCatalogs should have
    // removed the named "default" catalog from namedCatalogs in managers where they're the same,
    // and yarn install would have errored if a named catalog "default" was referenced but not defined.)
    catalogName === "default"
      ? catalogs.named?.default || catalogs.default
      : // Otherwise use either the given named catalog, or the default if no name was specified
        catalogName
        ? catalogs.named?.[catalogName]
        : catalogs.default;
  const catalogNameStr = catalogName ? `catalogs.${catalogName}` : "the default catalog";

  if (!checkCatalog && !allowNotFound) {
    throw new Error(`Dependency "${name}" uses a catalog version "${version}" but ${catalogNameStr} is not defined.`);
  }

  const actualSpec = checkCatalog?.[name];
  if (!actualSpec) {
    if (allowNotFound) {
      return undefined;
    }
    throw new Error(
      `Dependency "${name}" uses a catalog version "${version}", but ${catalogNameStr} doesn't define a version for "${name}".`
    );
  }

  if (isCatalogVersion(actualSpec)) {
    throw new Error(
      `Dependency "${name}" resolves to a recursive catalog version "${actualSpec}", which is not supported.`
    );
  }

  return actualSpec;
}
