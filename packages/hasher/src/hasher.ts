import { hashGlobGit } from "glob-hasher";
import crypto from "crypto";
import { RepoInfo } from "./repoInfo";
import { generateHashOfInternalPackages, getPackageHash, PackageHashInfo } from "./hashOfPackage";
import { findWorkspacePath, WorkspaceInfo } from "workspace-tools";

function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");
  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}

function sortObject<T>(unordered: Record<string, T>): Record<string, T> {
  return Object.keys(unordered)
    .sort((a, b) => a.localeCompare(b))
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});
}

export interface HashOptions {
  cwd: string;
  inputs: string[];
  gitignore: boolean;
  salt: string;
  repoInfo: RepoInfo;
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

export class Hasher {
  public async hashPackage(options: HashOptions): Promise<string> {
    const { repoInfo, cwd, salt } = options;
    const { workspaceInfo } = repoInfo;

    const queue = [cwd];
    const done: PackageHashInfo[] = [];

    while (queue.length > 0) {
      const packageRoot = queue.shift();

      if (!packageRoot) {
        continue;
      }

      const packageHash = await getPackageHash(packageRoot, repoInfo);

      addToQueue(packageHash.internalDependencies, queue, done, workspaceInfo);

      done.push(packageHash);
    }

    const internalPackagesHash = generateHashOfInternalPackages(done);
    const buildCommandHash = hashStrings(salt);
    const combinedHash = hashStrings([internalPackagesHash, buildCommandHash]);

    return combinedHash;
  }

  public async hashFiles(options: HashOptions): Promise<string> {
    const { gitignore, inputs, salt, cwd } = options;
    const hashes = hashGlobGit(inputs, { cwd, gitignore }) ?? {};

    const sortedHashMap = sortObject(hashes);
    const sortedHashes = Object.values(sortedHashMap);

    const buildCommandHash = hashStrings(salt);

    return hashStrings(sortedHashes.concat(buildCommandHash));
  }
}
