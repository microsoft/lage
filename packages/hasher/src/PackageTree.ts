import execa from "execa";
import path from "path";
import fs from "fs";

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

  async #findFilesFromGitTree(packagePath: string, patterns: string[]) {
    const { includeUntracked } = this.options;

    const cwd = path.isAbsolute(packagePath) ? packagePath : path.join(this.options.root, packagePath);

    const trackedPromise = execa(
      "git",
      [
        "ls-files",
        "-z",
        ...patterns.filter((p) => !p.startsWith("!")),
        ...patterns.filter((p) => p.startsWith("!")).map((p) => `:!:${p.slice(1)}`),
      ],
      { cwd }
    ).then((lsFilesResults) => {
      if (lsFilesResults.exitCode === 0) {
        return lsFilesResults.stdout.split("\0").filter((f) => Boolean(f) && fs.existsSync(path.join(cwd, f)));
      }
      return [];
    });

    const untrackedPromise = includeUntracked
      ? execa(
          "git",
          [
            "ls-files",
            "-z",
            "-o",
            "--exclude-standard",
            ...patterns.filter((p) => !p.startsWith("!")),
            ...patterns.filter((p) => p.startsWith("!")).map((p) => `:!:${p.slice(1)}`),
          ],
          { cwd }
        ).then((lsOtherResults) => {
          if (lsOtherResults.exitCode === 0) {
            return lsOtherResults.stdout.split("\0").filter((f) => Boolean(f));
          }
          return [];
        })
      : Promise.resolve<string[]>([]);

    const [trackedFiles, untrackedFiles] = await Promise.all([trackedPromise, untrackedPromise]);

    return trackedFiles.concat(untrackedFiles);
  }

  async findFilesInPath(packagePath: string, patterns: string[]) {
    const key = `${packagePath}\0${patterns.join("\0")}`;
    if (!this.#memoizedPackageFiles[key]) {
      const files = (await this.#findFilesFromGitTree(packagePath, patterns)).map((f) => path.join(packagePath, f));
      this.#memoizedPackageFiles[key] = files;
    }

    return this.#memoizedPackageFiles[key];
  }

  cleanup() {}
}
