import { type PackageInfo } from "./PackageInfo.js";

/**
 * Info about a single package ("workspace" in npm/yarn/pnpm terms) within a monorepo.
 *
 * (Ideally this should be called just `WorkspaceInfo`, since "workspace" and "package" mean
 * the same thing, but that name was previously used for the aggregate type.)
 */
export interface WorkspacePackageInfo {
  /** Package name */
  name: string;
  /** Absolute path to the package root */
  path: string;
  /** `package.json` contents + path */
  packageJson: PackageInfo;
}

/**
 * Array with names, paths, and package.json contents for each package ("workspace" in
 * npm/yarn/pnpm terms) within a monorepo.
 */
export type WorkspaceInfos = WorkspacePackageInfo[];
