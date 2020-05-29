import { PackageInfos } from "workspace-tools";

export interface Workspace {
  root: string;
  allPackages: PackageInfos;
  changePackages: string[];
  npmClient: string;
  npmCmd: string;
}
