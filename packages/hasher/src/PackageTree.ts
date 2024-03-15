import execa from "execa";
import path from "path";
import fs from "fs";
import micromatch from "micromatch";

export interface LocalPackageTreeOptions {
  root: string;
  includeUntracked: boolean;
}

interface PathNode {
  [key: string]: PathNode;
}

/**
 * Keeps a data structure to quickly find all files in a package.
 */
export class PackageTree {
  #tree: PathNode = {};
  #packageFiles: Record<string, string[]> = {};
  #memoizedPackageFiles: Record<string, string[]> = {};

  constructor(private options: LocalPackageTreeOptions) {}

  reset() {
    // reset the internal state
    this.#tree = {};
    this.#packageFiles = {};
    this.#memoizedPackageFiles = {};
  }

  async initialize() {
    this.reset();
  }

  async #addFilesFromGitTree(packagePath: string, patterns: string[]) {
    const { includeUntracked } = this.options;

    // Get all files in the workspace (scale: ~2000) according to git
    const lsFilesResults = await execa(
      "git",
      [
        "ls-files",
        "-z",
        ...patterns.filter((p) => !p.startsWith("!")),
        ...patterns.filter((p) => p.startsWith("!")).map((p) => `:!:${p.slice(1)}`),
      ],
      { cwd: packagePath }
    );

    if (lsFilesResults.exitCode === 0) {
      const files = lsFilesResults.stdout.split("\0").filter((f) => Boolean(f) && fs.existsSync(path.join(packagePath, f)));
      this.#addToPackageTree(files);
    }

    if (includeUntracked) {
      // Also get all untracked files in the workspace according to git
      const lsOtherResults = await execa(
        "git",
        [
          "ls-files",
          "-o",
          "--exclude-standard",
          ...patterns.filter((p) => !p.startsWith("!")),
          ...patterns.filter((p) => p.startsWith("!")).map((p) => `:!:${p.slice(1)}`),
        ],
        { cwd: packagePath }
      );
      if (lsOtherResults.exitCode === 0) {
        const files = lsOtherResults.stdout.split("\0").filter(Boolean);
        this.#addToPackageTree(files);
      }
    }
  }

  async #addToPackageTree(filePaths: string[]) {
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

  async findFilesInPath(packagePath: string, patterns: string[]) {
    const key = `${packagePath}\0${patterns.join("\0")}`;

    if (!this.#memoizedPackageFiles[key]) {
      await this.#addFilesFromGitTree(packagePath, patterns);
      const packageFiles = this.#packageFiles[packagePath];

      if (!packageFiles) {
        return [];
      }

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

  cleanup() {}
}
