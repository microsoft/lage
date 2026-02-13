import { type PackageInfos } from "workspace-tools";

import execa from "execa";
import path from "path";
import fs from "fs";
import micromatch from "micromatch";

export interface PackageTreeOptions {
  root: string;
  packageInfos: PackageInfos;
  includeUntracked: boolean;
}

interface PathNode {
  children: {
    [key: string]: PathNode;
  };

  isPackage: boolean;
}

/**
 * Package Tree keeps a data structure to quickly find all files in a package.
 *
 * TODO: add a watcher to make sure the tree is up to date during a "watched" run.
 */
export class PackageTree {
  #tree: PathNode = { children: {}, isPackage: true };
  #packageFiles: Record<string, string[]> = {};
  #memoizedPackageFiles: Record<string, string[]> = {};

  constructor(private options: PackageTreeOptions) {}

  private reset(): void {
    // reset the internal state
    this.#tree = { children: {}, isPackage: true };
    this.#packageFiles = {};
    this.#memoizedPackageFiles = {};
  }

  public async initialize(): Promise<void> {
    const { root, includeUntracked, packageInfos } = this.options;

    this.reset();

    // Generate path tree of all packages in workspace (scale: ~2000 * ~3)
    for (const info of Object.values(packageInfos)) {
      const packagePath = path.dirname(info.packageJsonPath);
      const pathParts = path.relative(root, packagePath).split(/[\\/]/);

      let currentNode = this.#tree;

      for (const part of pathParts) {
        // initialize the children if not already done
        currentNode.children[part] = currentNode.children[part] || { children: {}, isPackage: false };
        currentNode = currentNode.children[part];
      }

      currentNode.isPackage = true;
    }

    // Get all files in the workspace (scale: ~2000) according to git
    const lsFilesResults = await execa("git", ["ls-files", "-z"], { cwd: root });

    if (lsFilesResults.exitCode === 0) {
      const files = lsFilesResults.stdout.split("\0").filter((f) => Boolean(f) && fs.existsSync(path.join(root, f)));
      this.addToPackageTree(files);
    }

    if (includeUntracked) {
      // Also get all untracked files in the workspace according to git
      const lsOtherResults = await execa("git", ["ls-files", "-o", "-z", "--exclude-standard"], { cwd: root });
      if (lsOtherResults.exitCode === 0) {
        const files = lsOtherResults.stdout.split("\0").filter(Boolean);
        this.addToPackageTree(files);
      }
    }
  }

  private addToPackageTree(filePaths: string[]): void {
    // key: path/to/package (packageRoot), value: array of a tuple of [file, hash]
    const packageFiles = this.#packageFiles;

    for (const entry of filePaths) {
      const pathParts = entry.split(/[\\/]/);

      let node = this.#tree;

      const pathPartsBuffer: string[] = [];
      let packagePathParts: string[] = [];

      for (const part of pathParts) {
        if (node.children[part]) {
          node = node.children[part] as PathNode;
          pathPartsBuffer.push(part);

          if (node.isPackage) {
            packagePathParts = [...pathPartsBuffer];
          }
        } else {
          break;
        }
      }

      const packageRoot = packagePathParts.join("/");
      packageFiles[packageRoot] = packageFiles[packageRoot] || [];
      packageFiles[packageRoot].push(entry);
    }
  }

  public getPackageFiles(packageName: string, patterns: string[]): string[] {
    const { root, packageInfos } = this.options;
    const packagePath = path.relative(root, path.dirname(packageInfos[packageName].packageJsonPath)).replace(/\\/g, "/");

    const packageFiles = this.#packageFiles[packagePath];

    if (!packageFiles) {
      return [];
    }

    const key = `${packageName}\0${patterns.join("\0")}`;

    if (!this.#memoizedPackageFiles[key]) {
      const packagePatterns: string[] = [];
      const simplePaths: string[] = [];
      for(const pattern of patterns) {
        // If the input is a pattern, we have to run micromatch to convert that into a list of files
        if(/[{}*?\[\]!+()]|@\(/.test(pattern)) {
          if (pattern.startsWith("!")) {
            packagePatterns.push(`!${path.join(packagePath, pattern.slice(1)).replace(/\\/g, "/")}`);
          } else {
            packagePatterns.push(path.join(packagePath, pattern).replace(/\\/g, "/"));
          }
        } else {
          // No special characters, so no need to do pattern matching, just take the file exactly as is, and
          // assume it could/should exist
          simplePaths.push(path.join(packagePath, pattern));
        }
      }
      this.#memoizedPackageFiles[key] = [
        ...simplePaths,
        ...(packagePatterns.length ? micromatch(packageFiles, packagePatterns, { dot: true }) : []),
      ].sort();
    }

    return this.#memoizedPackageFiles[key];
  }
}
