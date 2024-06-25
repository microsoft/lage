import path from "path";
import { globby } from "@lage-run/globby";

export interface LocalPackageTreeOptions {
  root: string;
  includeUntracked: boolean;
}

/**
 * Keeps a data structure to quickly find all files in a package.
 */
export class PackageTree {
  #memoizedPackageFiles: Record<string, string[]> = {};

  constructor(private options: LocalPackageTreeOptions) {}

  reset() {
    // reset the internal state
    this.#memoizedPackageFiles = {};
  }

  async initialize() {
    this.reset();
  }

  async #findFilesFromGitTree(packagePath: string, patterns: string[]) {
    const cwd = path.isAbsolute(packagePath) ? packagePath : path.join(this.options.root, packagePath);
    return globby(patterns, { cwd, onlyFiles: true, ignore: [".git"], gitignore: true, absolute: true }) ?? [];
  }

  async findFilesInPath(packagePath: string, patterns: string[]) {
    const key = `${packagePath}\0${patterns.join("\0")}`;
    if (!this.#memoizedPackageFiles[key]) {
      const files = await this.#findFilesFromGitTree(packagePath, patterns);
      this.#memoizedPackageFiles[key] = files;
    }

    return this.#memoizedPackageFiles[key];
  }

  cleanup() {}
}
