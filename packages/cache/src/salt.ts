import { hashGlobGit } from "glob-hasher";
import { hashStrings } from "./hashStrings";

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

function sortObject(unordered: Record<string, unknown>) {
  return Object.keys(unordered)
    .sort((a, b) => a.localeCompare(b))
    .reduce((obj, key) => {
      obj[key] = unordered[key];
      return obj;
    }, {});
}

async function getEnvHash(environmentGlobFiles: string[], repoRoot: string): Promise<string[]> {
  const key = envHashKey(environmentGlobFiles);

  // We want to make sure that we only call getEnvHashOneAtTime one at a time
  // to avoid having many concurrent calls to read files again and again
  oneAtATime = oneAtATime.then(() => {
    // we may already have it by time we get to here
    if (envHashes[key]) {
      return envHashes[key];
    }

    return getEnvHashOneAtTime(environmentGlobFiles, repoRoot);
  });

  return oneAtATime;
}

function getEnvHashOneAtTime(environmentGlobFiles: string[], repoRoot: string) {
  const hashes = hashGlobGit(environmentGlobFiles, { cwd: repoRoot, gitignore: false })!;

  const sortedHashes = sortObject(hashes);
  const key = envHashKey(environmentGlobFiles);

  envHashes[key] = Object.values(sortedHashes);

  return envHashes[key];
}
