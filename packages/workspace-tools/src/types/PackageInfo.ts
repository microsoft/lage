import type { Catalog, NamedCatalogs } from "./Catalogs.js";

/** Contents of `package.json`, plus the `packageJsonPath` */
export interface PackageInfo {
  /** Absolute path to this package.json file */
  packageJsonPath: string;
  name: string;
  version: string;
  dependencies?: { [dep: string]: string };
  devDependencies?: { [dep: string]: string };
  peerDependencies?: { [dep: string]: string };
  optionalDependencies?: { [dep: string]: string };
  private?: boolean;
  group?: string;
  scripts?: { [scriptName: string]: string };
  repository?: string | { type: string; url: string; directory?: string };
  [key: string]: any;

  /**
   * Workspace info, only in the root package.json for certain managers.
   * If an array of strings, it's a list of workspace package patterns.
   */
  workspaces?:
    | string[]
    | {
        /** List of workspace package patterns */
        packages: string[];
        nohoist?: string[];
        /** `midgard-yarn-strict` catalog definition (yarn4/pnpm use yaml config) */
        catalog?: Catalog;
        /** `midgard-yarn-strict` named catalog definition (yarn4/pnpm use yaml config) */
        catalogs?: NamedCatalogs;
        [key: string]: any;
      };
}

/** Mapping from package name to info (`package.json`) for packages within a monorepo. */
export interface PackageInfos {
  [pkgName: string]: PackageInfo;
}
