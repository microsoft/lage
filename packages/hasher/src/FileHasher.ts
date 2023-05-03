/* eslint-disable no-console */
import fs from "fs";
import path from "path";
import { hash as fastHash, stat } from "glob-hasher";
import { createInterface } from "node:readline";

import fg from "fast-glob";

interface FileHashStoreOptions {
  root: string;
}

export class FileHasher {
  #store: Record<string, string> = {};
  #manifestFile: string;

  getKey(relativePath: string, mtime: bigint, size: number) {
    return `${mtime}-${size}-${relativePath}`;
  }

  constructor(private options: FileHashStoreOptions) {
    const { root } = options;
    const cacheDirectory = path.join(root, "node_modules", ".cache", "lage");
    this.#manifestFile = path.join(cacheDirectory, "file_hashes.json");
  }

  async getHashesFromGit() {}

  async readManifest() {
    return new Promise<void>((resolve, reject) => {
      if (!fs.existsSync(this.#manifestFile)) {
        return resolve();
      }

      const inputStream = fs.createReadStream(this.#manifestFile, "utf-8");
      const rl = createInterface({
        input: inputStream,
        crlfDelay: Infinity,
      });

      rl.on("line", (line) => {
        const [key, hash] = line.split(":");
        this.#store[key] = hash;
      });

      inputStream.on("end", () => {
        rl.close();
        resolve();
      });
    });
  }

  writeManifest() {
    const outputStream = fs.createWriteStream(this.#manifestFile, "utf-8");
    for (const [key, hash] of Object.entries(this.#store)) {
      outputStream.write(`${key}:${hash}\n`);
    }

    outputStream.end();
  }

  async initializeManifest() {}

  async hash(files: string[]) {
    const hashes: Record<string, string> = {};

    const updatedFiles: string[] = [];

    const stats = stat(files, { cwd: this.options.root }) ?? {};

    await Promise.all(
      files.map(async (file) => {
        const stat = stats[file];
        const key = this.getKey(file, stat?.mtime, stat?.size);
        const hash = this.#store[key];
        if (hash) {
          hashes[file] = hash;
        } else {
          updatedFiles.push(file);
        }
      })
    );

    const updatedHashes = fastHash(updatedFiles, { cwd: this.options.root }) ?? {};

    await Promise.all(
      Object.entries(updatedHashes).map(async ([file, hash]) => {
        const stat = fs.statSync(path.join(this.options.root, file), { bigint: true });
        const key = this.getKey(file, stat.mtimeMs, Number(stat.size));
        this.#store[key] = hash;
        hashes[file] = hash;
      })
    );

    return hashes;
  }
}

if (require.main === module) {
  (async () => {
    const root = "/workspace/tmp1";
    const hasher = new FileHasher({ root });

    console.time("fg");
    const files = await fg(["**/*"], { cwd: root, ignore: ["**/node_modules"] });
    console.timeEnd("fg");

    console.log(files.length);

    console.time("read");
    await hasher.readManifest();
    console.timeEnd("read");

    console.time("hasher.hash");
    const hashes = await hasher.hash(files);
    console.timeEnd("hasher.hash");

    console.time("write");
    await hasher.writeManifest();
    console.timeEnd("write");

    console.log(Object.keys(hashes).length);
  })();
}
