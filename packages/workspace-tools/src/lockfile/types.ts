export type Dependencies = { [key in string]: string };

export type LockDependency = {
  version: string;
  dependencies?: Dependencies;
};

export type ParsedLock = {
  type: "success" | "merge" | "conflict";
  object: {
    [key in string]: LockDependency;
  };
};

/** pnpm `pnpm-lock.yaml` format */
export interface PnpmLockFile {
  /** Lockfile format version, e.g. `5.4`, `'6.0'` or `'9.0'`. */
  lockfileVersion?: number | string;
  /** Resolution metadata. In lockfileVersion 6.0 and earlier this also holds dependency edges. */
  packages?: { [name: string]: any };
  /** Dependency edges in lockfileVersion 9.0 and later. */
  snapshots?: {
    [name: string]: { name?: string; dependencies?: Dependencies; optionalDependencies?: Dependencies };
  };
  /**
   * Workspace packages, keyed by their path relative to the lockfile root (`.`, `packages/foo`).
   * Present in monorepo (and all 9.0) lockfiles. Unlike `packages`/`snapshots` these have no
   * published `name@version`; their dependency edges are recorded as `{ specifier, version }`.
   */
  importers?: { [importerPath: string]: PnpmImporter };
}

/** A single `importers` entry (one workspace package) in a pnpm lockfile. */
export interface PnpmImporter {
  /** The workspace package's `dependencies`. */
  dependencies?: PnpmImporterDependencies;
  /** The workspace package's `devDependencies`. */
  devDependencies?: PnpmImporterDependencies;
  /** The workspace package's `optionalDependencies`. */
  optionalDependencies?: PnpmImporterDependencies;
}

/**
 * Importer dependency edges. In lockfileVersion 6.0/9.0 each value is a `{ specifier, version }`
 * object; older lockfiles use a bare version string.
 */
export type PnpmImporterDependencies = {
  [name: string]: { specifier?: string; version?: string } | string;
};

export interface NpmWorkspacesInfo {
  version: string;
  workspaces: { packages: string[] };
}

export interface NpmSymlinkInfo {
  resolved: string; // Where the package is  resolved from.
  link: boolean; // A flag to indicate that this is a symbolic link.
  integrity?: "sha512" | "sha1";
  dev?: boolean;
  optional?: boolean;
  devOptional?: boolean;
  dependencies?: { [key: string]: LockDependency };
}

/** npm `package-lock.json` format */
export interface NpmLockFile {
  name: string;
  version: string;
  lockfileVersion?: 1 | 2 | 3; // 1: v5, v6; 2: backwards compatible v7; 3: non-backwards compatible v7
  requires?: boolean;
  packages?: {
    ""?: NpmWorkspacesInfo; // Monorepo root
  } & { [key: string]: NpmSymlinkInfo | LockDependency };
  dependencies?: { [key: string]: LockDependency };
}

/** Yarn Berry (v2+) `yarn.lock` YAML format */
export interface BerryLockFile {
  __metadata: any;
  [key: string]: {
    version: string;
    dependencies: {
      [dependency: string]: string;
    };
  };
}
