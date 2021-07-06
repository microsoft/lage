import * as path from "path";
import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs";
import os from "os";
import process from "process";

let envHash: string[];

export function salt(
  environmentGlobFiles: string[],
  command: string,
  repoRoot: string,
  customKey: string = ""
): string {
  return hashStrings([
    ...getEnvHash(environmentGlobFiles, repoRoot),
    os.platform(),
    process.version,
    command,
    customKey,
  ]);
}

function getEnvHash(environmentGlobFiles: string[], repoRoot: string) {
  if (!envHash) {
    const newline = /\r\n|\r|\n/g;
    const LF = "\n";
    const files = fg.sync(environmentGlobFiles, {
      cwd: repoRoot,
    });

    files.sort((a, b) => a.localeCompare(b));

    const hashes = files.map((file) => {
      const hasher = crypto.createHash("sha1");
      hasher.update(file);

      const fileBuffer = fs.readFileSync(path.join(repoRoot, file));
      const data = fileBuffer.toString().replace(newline, LF);
      hasher.update(data);

      return hasher.digest("hex");
    });

    envHash = hashes;
  }

  return envHash;
}

function hashStrings(strings: string | string[]): string {
  const hasher = crypto.createHash("sha1");
  const anArray = typeof strings === "string" ? [strings] : strings;
  const elements = [...anArray];
  elements.sort((a, b) => a.localeCompare(b));
  elements.forEach((element) => hasher.update(element));

  return hasher.digest("hex");
}
