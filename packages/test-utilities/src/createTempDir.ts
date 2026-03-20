import tmp from "tmp";
import { normalizedTmpdir } from "normalized-tmpdir";

export interface CreateTempDirOptions {
  /**
   * Prefix for the temp directory (a random suffix will be added).
   * @default 'lage-test-'
   */
  prefix?: string;

  /**
   * If true, call `tmp.setGracefulCleanup()` to make it more likely that the directory will be
   * cleaned up on exit.
   * @default true
   */
  gracefulCleanup?: boolean;
}

/**
 * Create a temporary directory and return the normalized path to the directory
 * (working around Mac and Windows quirks).
 *
 * This directory *should* be deleted automatically when the program exits, but it's more reliable
 * to include manual cleanup code.
 */
export function createTempDir(options: CreateTempDirOptions = {}): string {
  const { prefix = "lage-test-", gracefulCleanup = true } = options;

  if (gracefulCleanup) {
    tmp.setGracefulCleanup();
  }

  const tmpdir = normalizedTmpdir({ console: true });

  return tmp.dirSync({
    prefix,
    // "Unsafe" means try to delete on exit even if it still contains files...which actually is
    // safe for purposes of most tests
    unsafeCleanup: true,
    // Create a directory starting with this normalized path (to avoid comparison issues)
    tmpdir,
  }).name;
}
