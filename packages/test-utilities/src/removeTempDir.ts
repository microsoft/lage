import fs from "fs";
import fsPromises from "fs/promises";

/**
 * Recursively remove a temporary directory, ignoring any errors (which are usually not fatal
 * in the context of a one-time-use temp directory). This is to make tests more reliable
 * on Windows, where file locks (likely from the virus scanner) can be an issue.
 *
 * NOTE: If it's essential for other tests that the directory be removed successfully, consider using
 * `removeTempDirAsync` with `options.throwOnError` and `options.maxAttempts`.
 *
 * @returns Whether deleting the directory succeeded.
 * If `dir` was undefined or empty, it's a no-op and returns true.
 */
export function removeTempDir(dir: string | undefined): boolean {
  try {
    dir && fs.rmSync(dir, { recursive: true, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Recursively remove a temporary directory. Unless `options.throwOnError` is set, it will silently
 * ignore any errors (since they aren't fatal in the context of a one-time-use temp directory).
 * This is to make tests more reliable on Windows, where file locks (likely from the virus scanner)
 * can be an issue.
 *
 * NOTE: If it's essential for other tests that the directory be removed successfully, set
 * `options.throwOnError` and consider setting `options.maxAttempts`.
 *
 * @returns Whether deleting the directory succeeded.
 * If `dir` was undefined or empty, it's a no-op and returns true.
 */
export async function removeTempDirAsync(
  dir: string | undefined,
  options: {
    throwOnError?: boolean;
    /**
     * Maximum number of attempts (default is 1), with a delay between attempts.
     * If set, it will log a warning on the final failed attempt.
     */
    maxAttempts?: number;
  } = {}
): Promise<boolean> {
  const { throwOnError, maxAttempts = 1 } = options;
  let attempts = 1;

  while (attempts <= maxAttempts) {
    try {
      dir && (await fsPromises.rm(dir, { recursive: true, force: true }));
      return true;
    } catch (error) {
      if (!options.maxAttempts && !throwOnError) {
        // for basic usage, just return without logging
        return false;
      }

      if (attempts === maxAttempts) {
        const errMessage = error instanceof Error ? error.message : String(error);
        if (throwOnError) {
          throw new Error(`Failed to remove ${dir} after ${attempts} attempts: ${errMessage}`);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`Failed to clean up temp directory ${dir} after ${attempts} attempts (continuing): ${errMessage}`);
        }
      } else {
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 500 * attempts));
      }
    }
  }

  return false;
}
