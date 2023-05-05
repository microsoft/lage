import fs from "fs";
import path from "path";
import { hash as fastHash, stat } from "glob-hasher";
import { createInterface } from "node:readline";

import fg from "fast-glob";
import { getPackageDeps } from "./getPackageDeps.js";

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
    const cacheDirectory = path.join(root, "node_modules", ".cache", "lage");
    this.#manifestFile = path.join(cacheDirectory, "file_hashes.manifest");
  }

  async getHashesFromGit() {
    const { root } = this.options;
    const fileHashes = await getPackageDeps(root);
    const files = [...fileHashes.keys()];
    const fileStats = stat(files, { cwd: root }) ?? {};

    for (const [relativePath, fileStat] of Object.entries(fileStats)) {
      if (fileHashes.has(relativePath)) {
        this.#store[relativePath] = {
          mtime: fileStat.mtime,
          size: fileStat.size,
          hash: fileHashes.get(relativePath)!,
        };
      }
    }

    this.writeManifest();
  }

  async readManifest() {
    return new Promise<void>((resolve) => {
      if (!fs.existsSync(this.#manifestFile)) {
        this.getHashesFromGit().then(() => resolve());
        return;
      }

      const inputStream = fs.createReadStream(this.#manifestFile, "utf-8");
      const rl = createInterface({
        input: inputStream,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        const [relativePath, mtimeStr, sizeStr, hash] = line.split("\0");
        this.#store[relativePath] = {
          mtime: BigInt(mtimeStr),
          size: parseInt(sizeStr),
          hash,
        };
      });

      inputStream.on("end", () => {
        rl.close();
        resolve();
      });
    });
  }

  writeManifest() {
    fs.mkdirSync(path.dirname(this.#manifestFile), { recursive: true });
    const outputStream = fs.createWriteStream(this.#manifestFile, "utf-8");

    for (const [relativePath, info] of Object.entries(this.#store)) {
      outputStream.write(`${relativePath}\0${info.mtime.toString()}\0${info.size.toString()}\0${info.hash}\n`);
    }

    outputStream.end();
  }

  async initializeManifest() {}

  hash(files: string[]) {
    const hashes: Record<string, string> = {};

    const updatedFiles: string[] = [];

    const stats = stat(files, { cwd: this.options.root }) ?? {};

    for (const file of files) {
      const stat = stats[file];

      const info = this.#store[file];
      if (info && stat.mtime === info.mtime && stat.size == info.size) {
        hashes[file] = info.hash;
      } else {
        updatedFiles.push(file);
      }
    }

    const updatedHashes = fastHash(updatedFiles, { cwd: this.options.root, concurrency: 4 }) ?? {};

    for (const [file, hash] of Object.entries(updatedHashes)) {
      const stat = fs.statSync(path.join(this.options.root, file), { bigint: true });
      this.#store[file] = {
        mtime: stat.mtimeMs,
        size: Number(stat.size),
        hash,
      };
      hashes[file] = hash;
    }

    return hashes;
  }
}
