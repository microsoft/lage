/**
 * Mapping from package name to package version.
 * @see https://pnpm.io/catalogs#default-catalog
 * @see https://yarnpkg.com/features/catalogs#basic-usage
 */
export interface Catalog {
  [packageName: string]: string;
}

/**
 * Mapping from catalog name (non-default) to catalog definition
 * @see https://pnpm.io/catalogs#named-catalogs
 * @see https://yarnpkg.com/features/catalogs#named-catalogs
 */
export interface NamedCatalogs {
  [catalogName: string]: Catalog;
}

/**
 * Package version catalogs
 * @see https://pnpm.io/catalogs
 * @see https://yarnpkg.com/features/catalogs
 */
export interface Catalogs {
  /**
   * The default catalog (`catalog:`) if present.
   *
   * Whether this is equivalent to `catalogs.default` depends on the package manager:
   * they're the same in pnpm, but different in yarn. If there was a pnpm catalog named "default",
   * it will be stored under this property instead (but `getCatalogVersion` supports either syntax).
   */
  default?: Catalog;

  /**
   * Mapping from catalog name to catalog definition, if present.
   *
   * (For pnpm, if there was a catalog named "default", it will be under `Catalogs.default`
   * and omitted here.)
   */
  named?: NamedCatalogs;
}
