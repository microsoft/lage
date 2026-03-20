import path from "path";
import type { Logger } from "backfill-logger";
import { type PackageInfos, findPackageRoot } from "workspace-tools";
import { generateHashOfFiles } from "./hashOfFiles.js";
import {
  type PackageHashInfo,
  getPackageHash,
  generateHashOfInternalPackages,
} from "./hashOfPackage.js";
import { hashStrings } from "./hashStrings.js";
import { getRepoInfo, getRepoInfoNoCache } from "./repoInfo.js";

export interface IHasher {
  createPackageHash: (salt: string) => Promise<string>;
  hashOfOutput: () => Promise<string>;
}

/**
 * Add repo-internal dependencies to the queue, if not already done.
 */
export function _addToQueue(params: {
  /** Dependency names (will be filtered to internal ones) */
  dependencyNames: string[];
  /** Package path queue */
  queue: string[];
  /** Packages that are already done */
  done: PackageHashInfo[];
  /** Package infos internal to the repo */
  packageInfos: PackageInfos;
}): void {
  const { dependencyNames, queue, done, packageInfos } = params;

  for (const dependencyName of dependencyNames) {
    const dependencyInfo = packageInfos[dependencyName];
    const dependencyPath =
      dependencyInfo && path.dirname(dependencyInfo.packageJsonPath);

    if (
      dependencyPath &&
      !done.some((p) => p.name === dependencyName) &&
      !queue.includes(dependencyPath)
    ) {
      queue.push(dependencyPath);
    }
  }
}

export class Hasher implements IHasher {
  private packageRoot: string;

  constructor(
    options: {
      packageRoot: string;
    },
    private logger: Logger
  ) {
    this.packageRoot = options.packageRoot;
  }

  // TODO: This implementation is a bit odd... If the hasher is being reused for many packages,
  // the repoInfo should be created once and passed in. Otherwise it's a massive perf penalty to
  // recalculate for every package in a large repo. There's potentially also the opportunity to
  // reduce the perf penalty by only getting hashes for relevant packages per recursively walking
  // internal dependencies. (Fixing is lower priority since this is no longer used by lage.)
  public async createPackageHash(salt: string): Promise<string> {
    const tracer = this.logger.setTime("hashTime");

    // TODO: not sure why it's getting the root if this is already the root...?
    const entryPackageRoot = findPackageRoot(this.packageRoot);
    if (!entryPackageRoot) {
      throw new Error(
        `Could not find package.json inside ${this.packageRoot}.`
      );
    }

    const repoInfo = await getRepoInfo(entryPackageRoot);

    const { packageInfos } = repoInfo;

    const queue: string[] = [entryPackageRoot];
    const done: PackageHashInfo[] = [];

    while (queue.length > 0) {
      const nextPackageRoot = queue.shift()!;

      const packageHash = getPackageHash(
        nextPackageRoot,
        repoInfo,
        this.logger
      );

      _addToQueue({
        dependencyNames: packageHash.internalDependencies,
        queue,
        done,
        packageInfos,
      });

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = hashStrings(salt);
    const combinedHash = hashStrings([internalPackagesHash, buildCommandHash]);

    this.logger.verbose(`Hash of internal packages: ${internalPackagesHash}`);
    this.logger.verbose(`Hash of build command: ${buildCommandHash}`);
    this.logger.verbose(`Combined hash: ${combinedHash}`);

    tracer.stop();
    this.logger.setHash(combinedHash);

    return combinedHash;
  }

  /**
   * Hash of output will hash the output files. This is meant to be used by validation and will not cache the repo hashes.
   * The validateOutput option should be used sparingly for performance reasons. It is meant to help be a debugging tool
   * to help investigate integrity of the cache.
   */
  public async hashOfOutput(): Promise<string> {
    const repoInfo = await getRepoInfoNoCache(this.packageRoot);

    return generateHashOfFiles(this.packageRoot, repoInfo);
  }
}
