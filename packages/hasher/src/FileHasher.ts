import { getFileHashes } from "backfill-hasher";
import { hash as fastHash, stat as globStat } from "glob-hasher";
import fs from "graceful-fs";
import { createInterface } from "node:readline";
import path from "path";

interface FileHashStoreOptions {
  root: string;
}

type FileHashManifestStore = Record<
  string,
  {
    mtime: bigint;
    size: number;
    hash: string;
  }
>;

export class FileHasher {
  #store: FileHashManifestStore = {};
  #manifestFile: string;

  constructor(private options: FileHashStoreOptions) {
    const { root } = options;
    // Duplicates getCacheDirectoryRoot() to avoid a dependency on the cache package
    const cacheDirectory = path.join(root, "node_modules", ".cache", "lage");
    this.#manifestFile = path.join(cacheDirectory, "file_hashes.manifest");
  }

  private getHashesFromGit(): void {
    const { root } = this.options;
    const fileHashes = getFileHashes(root);
    const files = Object.keys(fileHashes);
    const fileStats = globStat(files, { cwd: root }) ?? {};

    for (const [relativePath, fileStat] of Object.entries(fileStats)) {
      const hash = fileHashes[relativePath];
      if (hash) {
        const { size, mtime } = fileStat;

        this.#store[relativePath] = { hash, size, mtime };
      }
    }

    this.writeManifest();
  }

  public async readManifest(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (!fs.existsSync(this.#manifestFile)) {
        try {
          this.getHashesFromGit();
          resolve();
        } catch (err) {
          reject(err);
        }
        return;
      }

      const inputStream = fs.createReadStream(this.#manifestFile, "utf-8");
      const rl = createInterface({
        input: inputStream,
        crlfDelay: Infinity,
      });

      let info: string[] = [];

      rl.on("line", (line) => {
        info = line.split("\0");

        this.#store[info[0]] = {
          mtime: BigInt(info[1]),
          size: parseInt(info[2]),
          hash: info[3],
        };
      });

      inputStream.on("end", () => {
        rl.close();
        resolve();
      });
    });
  }

  public writeManifest(): void {
    fs.mkdirSync(path.dirname(this.#manifestFile), { recursive: true });
    const outputLines = Object.entries(this.#store).map(([relativePath, info]) => {
      return `${relativePath}\0${info.mtime.toString()}\0${info.size.toString()}\0${info.hash}`;
    });

    fs.writeFileSync(this.#manifestFile, outputLines.join("\n"), "utf-8");
  }

  public hash(files: string[]): Record<string, string> {
    const hashes: Record<string, string> = {};
    if (files.length === 0) {
      return hashes;
    }

    const updatedFiles: string[] = [];

    const stats = globStat(files, { cwd: this.options.root }) ?? {};

    for (const file of files) {
      const stat = stats[file];

      const info = this.#store[file];
      if (info && stat && stat.mtime === info.mtime && stat.size == info.size) {
        hashes[file] = info.hash;
      } else {
        // Invalidate before hashing so a failed refresh cannot leave a stale entry.
        delete this.#store[file];
        updatedFiles.push(file);
      }
    }

    if (updatedFiles.length === 0) {
      return hashes;
    }

    const updatedHashes = fastHash(updatedFiles, { cwd: this.options.root, concurrency: 4 });
    if (!updatedHashes) {
      throw new Error("Failed to hash files");
    }

    for (const [file, hash] of Object.entries(updatedHashes)) {
      if (hash == null) {
        // Evict the native result's normalized key; input paths may use a different form.
        delete this.#store[file];
        throw new Error(`Failed to hash file "${file}"`);
      }

      const stat = stats[file];
      if (stat) {
        // Keep pre-hash metadata so edits during hashing invalidate the next lookup.
        this.#store[file] = { mtime: stat.mtime, size: stat.size, hash };
      } else {
        // Without pre-hash metadata, return the hash but do not cache it for reuse.
        delete this.#store[file];
      }
      hashes[file] = hash;
    }

    return hashes;
  }
}
