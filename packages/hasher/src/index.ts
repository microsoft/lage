import type { WorkspaceInfo } from "workspace-tools";
import { findWorkspacePath } from "workspace-tools";
import type { PackageHashInfo } from "./hashOfPackage.js";
import { getPackageHash, generateHashOfInternalPackages } from "./hashOfPackage.js";
import { hashStrings, getPackageRoot } from "./helpers.js";
import type { RepoInfo } from "./repoInfo.js";
import { getRepoInfo } from "./repoInfo.js";

export interface IHasher {
  createPackageHash: (salt: string) => Promise<string>;
}

function isDone(done: PackageHashInfo[], packageName: string): boolean {
  return Boolean(done.find(({ name }) => name === packageName));
}

function isInQueue(queue: string[], packagePath: string): boolean {
  return queue.indexOf(packagePath) >= 0;
}

export function addToQueue(dependencyNames: string[], queue: string[], done: PackageHashInfo[], workspaces: WorkspaceInfo): void {
  dependencyNames.forEach((name) => {
    const dependencyPath = findWorkspacePath(workspaces, name);

    if (dependencyPath) {
      if (!isDone(done, name) && !isInQueue(queue, dependencyPath)) {
        queue.push(dependencyPath);
      }
    }
  });
}

export class Hasher implements IHasher {
  private repoInfo?: RepoInfo;

  constructor(private packageRoot: string) {}

  public async createPackageHash(salt: string): Promise<string> {
    const packageRoot = await getPackageRoot(this.packageRoot);
    this.repoInfo = await getRepoInfo(packageRoot);

    const { workspaceInfo } = this.repoInfo;

    const queue = [packageRoot];
    const done: PackageHashInfo[] = [];

    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot) {
        continue;
      }

      const packageHash = await getPackageHash(packageRoot, this.repoInfo);

      addToQueue(packageHash.internalDependencies, queue, done, workspaceInfo);

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = hashStrings(salt);
    const combinedHash = hashStrings([internalPackagesHash, buildCommandHash]);

    return combinedHash;
  }
}

export * from "./repoInfo.js";
