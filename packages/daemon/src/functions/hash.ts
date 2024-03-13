import { type PartialHashGlobOptions, hash as fastHash } from "glob-hasher";

const hashes: Record<string, string> = {};
export function hash(files: string[], options: PartialHashGlobOptions): Record<string, string> | null {
  const filesToProcess = files.filter((file) => !hashes[file]);

  if (filesToProcess.length > 0) {
    const newHashes = fastHash(filesToProcess, options);

    if (newHashes) {
      for (const file of filesToProcess) {
        if (file in newHashes) {
          hashes[file] = newHashes[file];
        }
      }
    }
  }

  const subset = files.reduce((acc, key) => {
    acc[key] = hashes[key];
    return acc;
  }, {} as Record<string, string>);

  return subset;
}
