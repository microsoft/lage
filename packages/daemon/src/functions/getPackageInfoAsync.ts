import { type PackageInfo, type PackageInfos, getPackageInfosAsync as original } from "workspace-tools";

const packageInfosByRoot: Map<string, Record<string, PackageInfo>> = new Map();

export async function getPackageInfosAsync(root: string): Promise<PackageInfos> {
  if (!packageInfosByRoot.has(root)) {
    packageInfosByRoot.set(root, await original(root));
  }

  return packageInfosByRoot.get(root)!;
}
