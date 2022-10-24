import * as path from "path";
import * as crypto from "crypto";
import * as fg from "fast-glob";
import * as fs from "fs/promises";

interface MemoizedEnvHashes {
  [key: string]: string[];
}

let envHashes: MemoizedEnvHashes = {};

// A promise to guarantee the getEnvHashes is done one at a time
let oneAtATime: Promise<any> = Promise.resolve();

export function _testResetEnvHash() {
  envHashes = {};
}

export async function salt(environmentGlobFiles: string[], command: string, repoRoot: string, customKey = ""): Promise<string> {
  const envHash = await getEnvHash(environmentGlobFiles, repoRoot);
  return hashStrings([...envHash, command, customKey]);
}

function envHashKey(environmentGlobFiles: string[]) {
  return environmentGlobFiles.sort().join("|");
}

async function getEnvHash(environmentGlobFiles: string[], repoRoot: string) {
  // We want to make sure that we only call getEnvHashOneAtTime one at a time
  // to avoid having many concurrent calls to read files again and again
  oneAtATime = oneAtATime.then(async () => {
    const searchResult = getEnvHashOneAtTime(environmentGlobFiles, repoRoot);
    if (searchResult) {
      return searchResult;
    }
    return getEnvHashOneAtTime(environmentGlobFiles, repoRoot);
  });

  return oneAtATime;
}

async function getEnvHashOneAtTime(environmentGlobFiles: string[], repoRoot: string) {
  const key = envHashKey(environmentGlobFiles);

  if (envHashes[key]) {
    return envHashes[key];
  }

  const envHash: string[] = [];
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

  envHashes[key] = envHash;
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
