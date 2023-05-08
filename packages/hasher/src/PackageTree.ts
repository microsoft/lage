import { type PackageInfos } from "workspace-tools";

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

/**
 * Package Tree keeps a data structure to quickly find all files in a package.
 *
 * TODO: add a watcher to make sure the tree is up to date during a "watched" run.
 */
export class PackageTree {
  #tree: PathNode = {};
  #packageFiles: Record<string, string[]> = {};
  #memoizedPackageFiles: Record<string, string[]> = {};

  constructor(private options: PackageTreeOptions) {}

  reset() {
    // reset the internal state
    this.#tree = {};
    this.#packageFiles = {};
    this.#memoizedPackageFiles = {};
  }

  async initialize() {
    const { root, includeUntracked, packageInfos } = this.options;

    this.reset();

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

    // Get all files in the workspace (scale: ~2000) according to git
    const lsFilesResults = await execa("git", ["ls-files", "-z"], { cwd: root });

    if (lsFilesResults.exitCode === 0) {
      const files = lsFilesResults.stdout.split("\0").filter(Boolean);
      this.addToPackageTree(files);
    }

    if (includeUntracked) {
      // Also get all untracked files in the workspace according to git
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

    const key = `${packageName}\0${patterns.join("\0")}`;

    if (!this.#memoizedPackageFiles[key]) {
      const packagePatterns = patterns.map((pattern) => {
        if (pattern.startsWith("!")) {
          return `!${path.join(packagePath, pattern.slice(1)).replace(/\\/g, "/")}`;
        }

        return path.join(packagePath, pattern).replace(/\\/g, "/");
      });
      this.#memoizedPackageFiles[key] = micromatch(packageFiles, packagePatterns, { dot: true });
    }

    return this.#memoizedPackageFiles[key];
  }
}
