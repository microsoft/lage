import fs from "fs";

/**
 * Recursively remove a temporary directory, ignoring any errors (which are usually not fatal
 * in the context of a one-time-use temp directory). This is to make tests more reliable
 * on Windows, where file locks (likely from the virus scanner) can be an issue.
 *
 * NOTE: If it's essential for other tests that the directory be removed successfully, use `fs`
 * removal methods directly.
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
