import * as path from "path";

import { ensureGitMinimumVersion } from "./ensureGitMinimumVersion.js";
import execa from "execa";
import { normalizeGitFileName } from "./normalizeGitFileName.js";
import { glob } from "glob-hasher";
import { gitIndexHashes } from "./gitIndexHashes.js";

/**
 * Parses the output of the "git status" command
 */
export function parseGitStatus(output: string): Map<string, string> {
  const changes: Map<string, string> = new Map<string, string>();

  /*
   * Typically, output will look something like:
   * M temp_modules/rush-package-deps-hash/package.json
   * D package-deps-hash/src/index.ts
   */

  // If there was an issue with `git ls-tree`, or there are no current changes, processOutputBlocks[1]
  // will be empty or undefined
  if (!output) {
    return changes;
  }

  // Note: The output of git hash-object uses \n newlines regardless of OS.
  const outputLines: string[] = output.trim().split("\n");
  for (const line of outputLines) {
    /*
     * changeType is in the format of "XY" where "X" is the status of the file in the index and "Y" is the status of
     * the file in the working tree. Some example statuses:
     *   - 'D' == deletion
     *   - 'M' == modification
     *   - 'A' == addition
     *   - '??' == untracked
     *   - 'R' == rename
     *   - 'RM' == rename with modifications
     *   - '[MARC]D' == deleted in work tree
     * Full list of examples: https://git-scm.com/docs/git-status#_short_format
     */
    const match: RegExpMatchArray | null = line.match(/("(\\"|[^"])+")|(\S+\s*)/g);

    if (match && match.length > 1) {
      const [changeType, ...filenameMatches] = match;

      // We always care about the last filename in the filenames array. In the case of non-rename changes,
      // the filenames array only contains one file, so we can join all segments that were split on spaces.
      // In the case of rename changes, the last item in the array is the path to the file in the working tree,
      // which is the only one that we care about. It is also surrounded by double-quotes if spaces are
      // included, so no need to worry about joining different segments
      let lastFilename: string = changeType.startsWith("R") ? filenameMatches[filenameMatches.length - 1] : filenameMatches.join("");
      lastFilename = normalizeGitFileName(lastFilename);

      changes.set(lastFilename, changeType.trim());
    }
  }

  return changes;
}

/**
 * Takes a list of files and returns the current git hashes for them
 *
 * @public
 */
export async function getGitHashForFiles(packagePath: string, filesToHash: string[], gitPath?: string): Promise<Map<string, string>> {
  const changes: Map<string, string> = new Map<string, string>();

  if (filesToHash.length) {
    // Use --stdin-paths arg to pass the list of files to git in order to avoid issues with
    // command length
    const result = await execa(gitPath || "git", ["hash-object", "--stdin-paths"], {
      input: filesToHash.map((x) => path.resolve(packagePath, x)).join("\n"),
    });

    if (result.exitCode !== 0) {
      ensureGitMinimumVersion(gitPath);

      throw new Error(`git hash-object exited with status ${result.exitCode}: ${result.stderr}`);
    }

    const hashStdout: string = result.stdout.trim();

    // The result of "git hash-object" will be a list of file hashes delimited by newlines
    const hashes: string[] = hashStdout.split("\n");

    if (hashes.length !== filesToHash.length) {
      throw new Error(`Passed ${filesToHash.length} file paths to Git to hash, but received ${hashes.length} hashes.`);
    }

    for (let i = 0; i < hashes.length; i++) {
      const hash: string = hashes[i];
      const filePath: string = filesToHash[i];
      changes.set(filePath, hash);
    }
  }

  return changes;
}

/**
 * Executes "git status" in a folder
 */
export async function gitStatus(path: string, gitPath?: string): Promise<string> {
  /**
   * -s - Short format. Will be printed as 'XY PATH' or 'XY ORIG_PATH -> PATH'. Paths with non-standard
   *      characters will be escaped using double-quotes, and non-standard characters will be backslash
   *      escaped (ex. spaces, tabs, double-quotes)
   * -u - Untracked files are included
   *
   * See documentation here: https://git-scm.com/docs/git-status
   */
  const result = await execa(gitPath || "git", ["status", "-s", "-u", "--", "."], {
    cwd: path,
  });

  if (result.exitCode !== 0) {
    ensureGitMinimumVersion(gitPath);

    throw new Error(`git status exited with status ${result.exitCode}: ${result.stderr}`);
  }

  return result.stdout;
}

export async function gitHash(cwd: string, files?: string[], gitPath?: string) {
  console.time("gitHash");
  const indexHashes = await gitIndexHashes(cwd, gitPath);
  const filesToHash: string[] = [];

  let result = new Map<string, string>();

  if (files) {
    for (const file of files) {
      const hash = indexHashes.get(file);
      if (hash) {
        result.set(file, hash);
      } else {
        filesToHash.push(file);
      }
    }
  } else {
    result = indexHashes;
  }

  // Update the checked in hashes with the current repo status
  const gitStatusOutput: string = await gitStatus(cwd, gitPath);
  const currentlyChangedFiles: Map<string, string> = parseGitStatus(gitStatusOutput);

  for (const [filename, changeType] of currentlyChangedFiles) {
    // See comments inside parseGitStatus() for more information
    if (changeType === "D" || (changeType.length === 2 && changeType.charAt(1) === "D")) {
      result.delete(filename);
    } else {
      filesToHash.push(filename);
    }
  }

  const fileHashes: Map<string, string> = await getGitHashForFiles(cwd, filesToHash, gitPath);
  for (const [filename, hash] of fileHashes) {
    result.set(filename, hash);
  }
  console.timeEnd("gitHash");
  return result;
}
