import crypto from "crypto";
import path from "path";
import { resolveInternalDependencies } from "./resolveInternalDependencies";
import { resolveExternalDependencies, Dependencies } from "./resolveExternalDependencies";
import { generateHashOfFiles } from "./hashOfFiles";
import { hashStrings } from "./helpers";
import { RepoInfo } from "./repoInfo";

export type PackageHashInfo = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
  internalDependencies: string[];
};

export function generateHashOfInternalPackages(internalPackages: PackageHashInfo[]): string {
  internalPackages.sort((a, b) => a.name.localeCompare(b.name));

  const hasher = crypto.createHash("sha1");
  internalPackages.forEach((pkg) => {
    hasher.update(pkg.name);
    hasher.update(pkg.filesHash);
    hasher.update(pkg.dependenciesHash);
  });

  return hasher.digest("hex");
}

const memoization: { [key: string]: PackageHashInfo } = {};

export async function getPackageHash(packageRoot: string, repoInfo: RepoInfo): Promise<PackageHashInfo> {
  const { workspaceInfo, parsedLock } = repoInfo;

  const memoizationKey = path.resolve(packageRoot);

  if (memoization[memoizationKey]) {
    return memoization[memoizationKey];
  }

  const { name, dependencies, devDependencies } = require(path.join(packageRoot, "package.json"));

  const allDependencies: Dependencies = {
    ...dependencies,
    ...devDependencies,
  };

  const internalDependencies = resolveInternalDependencies(allDependencies, workspaceInfo);

  const externalDeoendencies = resolveExternalDependencies(allDependencies, workspaceInfo, parsedLock);

  const resolvedDependencies = [...internalDependencies, ...externalDeoendencies];

  const filesHash = await generateHashOfFiles(packageRoot, repoInfo);
  const dependenciesHash = hashStrings(resolvedDependencies);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash,
    internalDependencies,
  };

  memoization[memoizationKey] = packageHash;

  return packageHash;
}
