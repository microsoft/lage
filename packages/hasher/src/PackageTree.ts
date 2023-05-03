/* eslint-disable no-console */
import { getPackageInfosAsync, type PackageInfos } from "workspace-tools";

import execa from "execa";
import path from "path";
import micromatch from "micromatch";

export interface PackageTreeOptions {
  root: string;
  packageInfos: PackageInfos;
  includeUntracked: boolean;
}

interface PathNode {
  [key: string]: PathNode;
}

export class PackageTree {
  #tree: PathNode = {};
  #packageFiles: Record<string, string[]> = {};

  constructor(private options: PackageTreeOptions) {
    const { root, packageInfos } = options;

    // Generate path tree of all packages in workspace (scale: ~2000 * ~3)
    for (const info of Object.values(packageInfos)) {
      const packagePath = path.dirname(info.packageJsonPath);
      const pathParts = path.relative(root, packagePath).split(/[\\/]/);

      let currentNode = this.#tree;

      for (const part of pathParts) {
        currentNode[part] = currentNode[part] || {};
        currentNode = currentNode[part];
      }
    }
  }

  async initialize() {
    const { root, includeUntracked } = this.options;
    const lsFilesResults = await execa("git", ["ls-files", "-z"], { cwd: root });

    if (lsFilesResults.exitCode === 0) {
      const files = lsFilesResults.stdout.split("\0").filter(Boolean);
      this.addToPackageTree(files);
    }

    if (includeUntracked) {
      const lsOtherResults = await execa("git", ["ls-files", "-o", "--exclude-standard"], { cwd: root });
      if (lsOtherResults.exitCode === 0) {
        const files = lsOtherResults.stdout.split("\0").filter(Boolean);
        this.addToPackageTree(files);
      }
    }
  }

  async addToPackageTree(filePaths: string[]) {
    // key: path/to/package (packageRoot), value: array of a tuple of [file, hash]
    const packageFiles = this.#packageFiles;

    for (const entry of filePaths) {
      const pathParts = entry.split(/[\\/]/);

      let node = this.#tree;
      const packagePathParts: string[] = [];

      for (const part of pathParts) {
        if (node[part]) {
          node = node[part] as PathNode;
          packagePathParts.push(part);
        } else {
          break;
        }
      }

      const packageRoot = packagePathParts.join("/");
      packageFiles[packageRoot] = packageFiles[packageRoot] || [];
      packageFiles[packageRoot].push(entry);
    }
  }

  getPackageFiles(packageName: string, patterns: string[]) {
    const { root, packageInfos } = this.options;
    const packagePath = path.relative(root, path.dirname(packageInfos[packageName].packageJsonPath)).replace(/\\/g, "/");

    const packageFiles = this.#packageFiles[packagePath];

    if (!packageFiles) {
      return [];
    }

    return micromatch(packageFiles, patterns, { dot: true });
  }
}

if (require.main === module) {
  const root = "/workspace/tmp1";
  (async () => {
    console.time("tree");

    const packageInfos = await getPackageInfosAsync(root);
    const packageTree = new PackageTree({ root, packageInfos, includeUntracked: true });
    await packageTree.initialize();

    console.log(packageTree.getPackageFiles("@msteams/apps-files", ["**/*"]));
    console.log(packageTree.getPackageFiles("@msteams/apps-chat", ["**/*"]));

    console.timeEnd("tree");
  })();
}
