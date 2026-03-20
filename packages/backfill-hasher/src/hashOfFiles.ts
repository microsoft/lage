import path from "path";
import { hashStrings } from "./hashStrings.js";
import type { RepoInfo } from "./types.js";

/**
 * Generates a hash string based on files in a package
 *
 * This implementation relies on `git hash-object` to quickly calculate all files
 * in the repo, caching this result so repeated calls to this function will be
 * a simple lookup.
 *
 * @param packageRoot The root of the package
 * @param repoInfo The repoInfo that carries information about repo-wide hashes
 */
export function generateHashOfFiles(
  packageRoot: string,
  repoInfo: RepoInfo
): string {
  const { repoHashes, root, packageHashes } = repoInfo;

  const hashes: string[] = [];
  const packageRelativeRoot = path
    .relative(root, packageRoot)
    .replace(/\\/g, "/");

  if (packageHashes[packageRelativeRoot]) {
    // Fast path: if files are clearly inside a package as per the packageHashes cache
    for (const hash of packageHashes[packageRelativeRoot]) {
      hashes.push(hash[0], hash[1]);
    }
  } else {
    // Slow old path: if files are not clearly inside a package (mostly the case for malformed monorepos, like tests)
    const normalized = path.normalize(packageRoot) + path.sep;

    const files = Object.keys(repoHashes)
      .filter((f) => path.join(root, f).includes(normalized))
      // Sort to ensure consistent ordering/hashing (use basic sorting since locale correctness doesn't matter)
      .sort();

    for (const file of files) {
      hashes.push(file, repoHashes[file]);
    }
  }

  return hashStrings(hashes);
}
