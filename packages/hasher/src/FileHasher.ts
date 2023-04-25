import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import { hash as fastHash } from "glob-hasher";
import { createInterface } from "node:readline";

interface FileHashStoreOptions {
  root: string;
}

export class FileHasher {
  #store: Record<string, string> = {};
  #manifestFile: string;

  async getKey(file: string) {
    const { root } = this.options;
    const relativePath = path.relative(root, file);
    const { mtimeMs, size } = await fsp.stat(file);
    return `${mtimeMs}-${size}-${relativePath}`;
  }

  constructor(private options: FileHashStoreOptions) {
    const { root } = options;
    const cacheDirectory = path.join(root, "node_modules", ".cache", "lage");
    this.#manifestFile = path.join(cacheDirectory, "file_hashes.json");
  }

  async readManifest() {
    const inputStream = await fs.createReadStream(this.#manifestFile, "utf-8");
    const rl = createInterface(inputStream);
    rl.on("line", (line) => {
      const [key, hash] = line.split(":");
      this.#store[key] = hash;
    });
    inputStream.close();
  }

  async writeManifest() {
    const outputStream = await fs.createWriteStream(this.#manifestFile, "utf-8");
    for (const [key, hash] of Object.entries(this.#store)) {
      outputStream.write(`${key}:${hash}\n`);
    }
    outputStream.close();
  }

  async hash(files: string[]) {
    const hashes: Record<string, string> = {};

    const updatedFiles: string[] = [];

    for (const file of files) {
      const key = await this.getKey(file);
      const hash = await this.#store[key];
      if (hash) {
        hashes[file] = hash;
      } else {
        updatedFiles.push(file);
      }
    }

    const updatedHashes = fastHash(updatedFiles, { cwd: this.options.root }) ?? {};

    Promise.all(
      Object.entries(updatedHashes).map(async ([file, hash]) => {
        const key = await this.getKey(file);
        this.#store[key] = hash;
        hashes[file] = hash;
      })
    );

    return hashes;
  }
}
