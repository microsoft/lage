import { PackageInfos } from "workspace-tools";

export interface Workspace {
  root: string;
  allPackages: PackageInfos;
  npmClient: string;
  /** @deprecated no longer used */
  npmCmd?: string;
}
