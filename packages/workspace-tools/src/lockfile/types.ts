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
  /** Resolution metadata. In lockfileVersion <= 6.0 this also holds dependency edges. */
  packages?: { [name: string]: any };
  /** Dependency edges in lockfileVersion >= 9.0. */
  snapshots?: { [name: string]: { dependencies?: Dependencies } };
}

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
