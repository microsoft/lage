import { PackageInfos } from "workspace-tools";

export interface Workspace {
  root: string;
  allPackages: PackageInfos;
  changedPackages: string[];
  npmClient: string;
  npmCmd: string;
}
