interface FileHashInfo {
  hash: string;
  createTime: BigInt;
}

export class FileHashes {
  // private readonly _hashes: Map<string, FileHashInfo> = new Map();
  // public has(filePath: string): boolean {
  // }
  // public get(filePath: string): string | undefined {
  //   return this._hashes.get(filePath).hash;
  // }
  // public set(filePath: string, fileHash: string): void {
  //   this._hashes.set(filePath, fileHash);
  // }

  getHashes(files: string, options: { cwd: string }): Map<string, FileHashInfo> {
    return new Map();
  }
}
