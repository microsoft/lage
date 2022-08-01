import * as path from "path";
import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs/promises";

let envHash: string[] | undefined = undefined;

export function _testResetEnvHash() {
  envHash = undefined;
}

export async function salt(environmentGlobFiles: string[], command: string, repoRoot: string, customKey = ""): Promise<string> {
  return hashStrings([...(await getEnvHash(environmentGlobFiles, repoRoot)), command, customKey]);
}

async function getEnvHash(environmentGlobFiles: string[], repoRoot: string) {
  if (!envHash) {
    envHash = [];
    const newline = /\r\n|\r|\n/g;
    const LF = "\n";
    const files = fg.sync(environmentGlobFiles, {
      cwd: repoRoot,
    });

    files.sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      const hasher = crypto.createHash("sha1");
      hasher.update(file);

      const fileBuffer = await fs.readFile(path.join(repoRoot, file), "utf-8");
      const data = fileBuffer.replace(newline, LF);
      hasher.update(data);

      envHash.push(hasher.digest("hex"));
    }
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
