import globby from "globby";
import {
  type PackageInfos,
  getWorkspaces,
  WorkspaceInfo,
  type ParsedLock,
  PackageInfo,
  getPackageInfos,
  parseLockFile,
} from "workspace-tools";
import { resolveExternalDependencies } from "./resolveExternalDependencies";
import { resolveInternalDependencies } from "./resolveInternalDependencies";
import path from "path";

type Dependencies = Record<string, string>;

export interface PackageHasherOptions {
  root: string;
  packageInfos: PackageInfos;
  parsedLock: ParsedLock;
}

export class PackageHasher {
  constructor(private options: PackageHasherOptions) {}

  async hash(packageName: string, inputs?: string[]) {
    const { root, packageInfos, parsedLock } = this.options;
    let packageFiles: string[] = [];

    const packageInfo = packageInfos[packageName];

    if (!packageInfo) {
      return null;
    }

    const { packageJsonPath } = packageInfo;

    //    const externalDeps = resolveExternalDependencies(allDependencies, workspaces, parsedLock);

    // if no inputs, it means all non-gitignored files and the package's internal deps source files as well
    if (!inputs) {
      packageFiles = await this.getPackageFiles(path.dirname(packageJsonPath));
      const internalDepFiles = await this.getInternalDependentPackageFiles(packageInfo);
      console.log(packageFiles, internalDepFiles);
    } else {
    }
  }

  async getInternalDependentPackageFiles(packageInfo: PackageInfo, inputs?: string[]) {
    console.log("HI");
    const { packageInfos } = this.options;

    function getInternalDeps(packageInfo: PackageInfo) {
      const { dependencies, devDependencies } = packageInfo;
      return [...(dependencies ? Object.keys(dependencies) : []), ...(devDependencies ? Object.keys(devDependencies) : [])].filter(
        (dep) => !!packageInfos[dep]
      );
    }

    const queue = [...getInternalDeps(packageInfo)];
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
        const deps = getInternalDeps(packageInfos[pkg]);
        queue.push(...deps);
      }
    }

    const allResults = await Promise.all(getFilePromises);
    return allResults.flat().sort();
  }

  async getExternalPackageAndNames(allDependencies) {}

  async getPackageFiles(packageRoot: string, inputs?: string[]) {
    return (await globby(inputs ?? ["**/*", "!**/node_modules/**"], { cwd: packageRoot, gitignore: true })).map((f) =>
      path.join(packageRoot, f)
    );
  }
}

if (require.main === module) {
  (async () => {
    const root = "/workspace/test-lage";
    const hasher = new PackageHasher({
      root,
      packageInfos: getPackageInfos(root),
      parsedLock: await parseLockFile(root),
    });
    console.log(await hasher.hash("lage"));
  })();
}
