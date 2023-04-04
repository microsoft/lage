import {
  type PackageInfos,
  type ParsedLock,
  PackageInfo,
  getPackageInfos,
  parseLockFile,
  nameAtVersion,
  queryLockFile,
} from "workspace-tools";
import path from "path";
import { glob, hash as hashFiles } from "glob-hasher";
import { hashStrings } from "./helpers";

export interface PackageHasherOptions {
  root: string;
  packageInfos: PackageInfos;
  parsedLock: ParsedLock;
}

export class PackageHasher {
  /** @type {import('globby')} */
  static globby;

  static packageHashes = new Map<string, string>();

  constructor(private options: PackageHasherOptions) {}

  async hash(packageName: string, inputs?: string[]) {
    if (PackageHasher.packageHashes.has(packageName)) {
      return PackageHasher.packageHashes.get(packageName);
    }

    const { root, packageInfos, parsedLock } = this.options;
    let packageFiles: string[] = [];

    const packageInfo = packageInfos[packageName];

    if (!packageInfo) {
      return null;
    }

    const { packageJsonPath } = packageInfo;

    const internalDeps = this.getInternalDeps(packageInfo);
    const externalDeps = this.getExternalDeps(packageInfo);

    // if no inputs, it means all non-gitignored files and the package's internal deps source files as well
    let sourceFiles: string[] = [];
    if (!inputs) {
      packageFiles = await this.getPackageFiles(path.dirname(packageJsonPath));
      const internalDepFiles = await this.getInternalDependentPackageFiles(packageInfo);
      sourceFiles = packageFiles.concat(internalDepFiles);
    } else {
      const packageFilePatterns: string[] = [];
      const dependencyFilePatterns: string[] = [];
      const globalFilePatterns: string[] = [];

      for (const input of inputs) {
        if (input.startsWith("^")) {
          dependencyFilePatterns.push(input.substring(1));
        } else if (input.startsWith("#")) {
          globalFilePatterns.push(input.substring(1));
        } else if (input.startsWith("//")) {
          globalFilePatterns.push(input.substring(2));
        } else {
          packageFilePatterns.push(input);
        }
      }

      packageFiles = await this.getPackageFiles(path.dirname(packageJsonPath), packageFilePatterns);
      const globalFiles = await this.getPackageFiles(root, packageFilePatterns);
      const internalDepFiles = await this.getInternalDependentPackageFiles(packageInfo, dependencyFilePatterns);

      sourceFiles = packageFiles.concat(internalDepFiles).concat(globalFiles);
    }

    const orderedSourceFiles = sourceFiles.sort();

    console.time("hashFiles");
    const fileHashes = hashFiles(orderedSourceFiles) ?? {};
    console.timeEnd("hashFiles");

    const hash = hashStrings([...Object.values(fileHashes), ...internalDeps, ...externalDeps]);

    return hash;
  }

  getInternalDeps(packageInfo: PackageInfo) {
    const { packageInfos } = this.options;
    const { dependencies, devDependencies } = packageInfo;
    return [...(dependencies ? Object.keys(dependencies) : []), ...(devDependencies ? Object.keys(devDependencies) : [])].filter(
      (dep) => !!packageInfos[dep]
    );
  }

  getExternalDeps(packageInfo: PackageInfo) {
    const { packageInfos } = this.options;
    const { dependencies, devDependencies } = packageInfo;
    return [...(dependencies ? Object.keys(dependencies) : []), ...(devDependencies ? Object.keys(devDependencies) : [])].filter(
      (dep) => !packageInfos[dep]
    );
  }

  async getInternalDependentPackageFiles(packageInfo: PackageInfo, inputs?: string[]) {
    const { packageInfos } = this.options;

    const queue = [...this.getInternalDeps(packageInfo)];
    const visited = new Set<string>();
    const getFilePromises: Promise<string[]>[] = [];

    while (queue.length > 0) {
      const pkg = queue.shift();

      if (!pkg) {
        continue;
      }

      if (visited.has(pkg)) {
        continue;
      }

      visited.add(pkg);
      getFilePromises.push(this.getPackageFiles(path.dirname(packageInfos[pkg].packageJsonPath), inputs));

      if (packageInfos[pkg]) {
        const deps = this.getInternalDeps(packageInfos[pkg]);
        queue.push(...deps);
      }
    }

    const allResults = await Promise.all(getFilePromises);
    return allResults.flat().sort();
  }

  async getExternalPackageAtVersion(packageInfo: PackageInfo) {
    const { parsedLock } = this.options;
    const dependencies = this.getExternalDeps(packageInfo);

    const queue = Object.entries(dependencies);
    const externals: string[] = [];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const nameVersion = queue.shift()!;

      if (visited.has(nameAtVersion(nameVersion[0], nameVersion[1]))) {
        continue;
      }

      const [name, versionRange] = nameVersion;
      visited.add(nameAtVersion(name, versionRange));

      const lockFileResult = queryLockFile(name, versionRange, parsedLock);

      if (lockFileResult) {
        const { version, dependencies } = lockFileResult;

        for (const [depName, depVersion] of Object.entries(dependencies ?? {})) {
          queue.push([depName, depVersion]);
        }

        externals.push(nameAtVersion(name, version));
      } else {
        externals.push(nameAtVersion(name, versionRange));
      }
    }

    return [...externals];
  }

  async getPackageFiles(packageRoot: string, inputs?: string[]) {
    console.time("glob " + packageRoot);
    const results = glob(inputs ?? [], { cwd: packageRoot, gitignore: true, concurrency: 16 }) ?? [];
    console.timeEnd("glob " + packageRoot);
    return results;
  }
}

if (require.main === module) {
  (async () => {
    try {
      const root = "/workspace/tmp1";
      const hasher = new PackageHasher({
        root,
        packageInfos: getPackageInfos(root),
        parsedLock: await parseLockFile(root),
      });
      console.log(await hasher.hash("@msteams/apps-files"));
    } catch (e) {
      console.error(e);
    }
  })();
}
