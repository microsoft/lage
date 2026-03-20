import crypto from "crypto";
import path from "path";
import type { Logger } from "backfill-logger";
import {
  resolveExternalDependencies,
  type Dependencies,
} from "./resolveExternalDependencies.js";
import { generateHashOfFiles } from "./hashOfFiles.js";
import { hashStrings } from "./hashStrings.js";
import type { RepoInfo } from "./types.js";

export type PackageHashInfo = {
  name: string;
  filesHash: string;
  dependenciesHash: string;
  internalDependencies: string[];
};

export function generateHashOfInternalPackages(
  internalPackages: PackageHashInfo[]
): string {
  // Sort to ensure consistent ordering/hashing (use basic sorting since locale correctness doesn't matter)
  internalPackages = [...internalPackages].sort();

  const hasher = crypto.createHash("sha1");
  for (const pkg of internalPackages) {
    hasher.update(pkg.name);
    hasher.update(pkg.filesHash);
    hasher.update(pkg.dependenciesHash);
  }

  return hasher.digest("hex");
}

const memoization: { [key: string]: PackageHashInfo } = {};

export function getPackageHash(
  packageRoot: string,
  repoInfo: RepoInfo,
  logger: Logger
): PackageHashInfo {
  const { packageInfos, parsedLock } = repoInfo;

  const memoizationKey = path.resolve(packageRoot);

  if (memoization[memoizationKey]) {
    return memoization[memoizationKey];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const { name, dependencies, devDependencies } = require(
    path.join(packageRoot, "package.json")
  );

  const allDependencies: Dependencies = {
    ...dependencies,
    ...devDependencies,
  };

  const internalDependencies = Object.keys(allDependencies).filter(
    (dependency) => packageInfos[dependency]
  );

  const externalDependencies = resolveExternalDependencies(
    allDependencies,
    packageInfos,
    parsedLock
  );

  const resolvedDependencies = [
    ...internalDependencies,
    ...externalDependencies,
  ];

  const filesHash = generateHashOfFiles(packageRoot, repoInfo);
  const dependenciesHash = hashStrings(resolvedDependencies);

  logger.silly(name);
  logger.silly(`  ${filesHash} (fileHash)`);
  logger.silly(`  ${dependenciesHash} (dependenciesHash)`);

  const packageHash = {
    name,
    filesHash,
    dependenciesHash,
    internalDependencies,
  };

  memoization[memoizationKey] = packageHash;

  return packageHash;
}
