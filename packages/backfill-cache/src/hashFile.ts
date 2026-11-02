import * as path from "path";
import { createReadStream, promises as fs } from "fs";
import * as crypto from "crypto";
import pLimit from "p-limit";

let MAX_FILE_OPERATIONS = 5000;

try {
  const maxFileOpEnv = process.env["BACKFILL_MAX_FILE_OP"];
  if (maxFileOpEnv) {
    MAX_FILE_OPERATIONS = parseInt(maxFileOpEnv);
  }
} catch {
  /* The env variable is not an integer, this is fine.*/
}

const diskLimit = pLimit(MAX_FILE_OPERATIONS);

// The first key is the file path, the second key is mtime
const memo = new Map<string, Map<number, string>>();

export function computeHash(
  filePath: string,
  algorithm: "sha1" | "sha256" = "sha1"
): Promise<string> {
  return diskLimit(async () => {
    const hash = crypto.createHash(algorithm);
    for await (const chunk of createReadStream(filePath)) {
      hash.update(chunk);
    }
    return hash.digest("hex");
  });
}

/*
 * Get the hash of a file.
 * This function memoizes the hash for files and mtimes.
 */
export async function getFileHash(
  cwd: string,
  filePath: string
): Promise<string> {
  const fileAbsPath = path.join(cwd, filePath);
  const stat = await fs.stat(fileAbsPath);

  let memoForFile = memo.get(fileAbsPath);
  if (!memoForFile) {
    memoForFile = new Map<number, string>();
    memo.set(fileAbsPath, memoForFile);
  }

  let hash = memoForFile.get(stat.mtimeMs);
  if (!hash) {
    hash = await computeHash(fileAbsPath);
    memoForFile.set(stat.mtimeMs, hash);
  }
  return hash;
}
