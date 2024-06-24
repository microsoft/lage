import path from "path";

export interface LocalPackageTreeOptions {
  root: string;
  includeUntracked: boolean;
}

/**
 * Keeps a data structure to quickly find all files in a package.
 */
export class PackageTree {
  #memoizedPackageFiles: Record<string, string[]> = {};
  #globby?: (patterns: string[], options: { cwd: string; onlyFiles: true; ignore: string[]; gitignore: true }) => Promise<string[]>;

  constructor(private options: LocalPackageTreeOptions) {}

  reset() {
    // reset the internal state
    this.#memoizedPackageFiles = {};
  }

  async initialize() {
    this.reset();
    this.#globby = (await import("globby")).globby;
  }

  async #findFilesFromGitTree(packagePath: string, patterns: string[]) {
    const cwd = path.isAbsolute(packagePath) ? packagePath : path.join(this.options.root, packagePath);
    return this.#globby?.(patterns, { cwd, onlyFiles: true, ignore: [".git"], gitignore: true }) ?? [];
  }

  async findFilesInPath(packagePath: string, patterns: string[]) {
    const key = `${packagePath}\0${patterns.join("\0")}`;
    if (!this.#memoizedPackageFiles[key]) {
      const files = (await this.#findFilesFromGitTree(packagePath, patterns)).map((f: string) => path.join(packagePath, f));
      this.#memoizedPackageFiles[key] = files;
    }

    return this.#memoizedPackageFiles[key];
  }

  cleanup() {}
}
