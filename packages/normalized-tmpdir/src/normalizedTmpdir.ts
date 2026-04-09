import fs from "fs";
import os from "os";
import type { NormalizedTmpdirOptions } from "./types.js";
import { expandShortPath } from "./expandShortPath.js";

/**
 * Mapping from short to long temp directory paths (Windows only).
 * false indicates a previous unsuccessful attempt to calculate a long path.
 * (There will probably only ever be one value returned from `os.tmpdir()`, unless someone is
 * messing with environment variables, but this handles it regardless.)
 */
let windowsLongTmpdirs = new Map<string, string | false>();

/**
 * Clear the cache of Windows temp directory paths for testing.
 */
export function clearWindowsCache(): void {
  windowsLongTmpdirs = new Map();
}

/**
 * Return a normalized path to the OS temp directory, working around Mac and Windows quirks
 * which can cause path comparison problems.
 *
 * If Windows normalization fails, the original path is returned, by default with no logging.
 * Set `options.console` to enable failure logging.
 *
 * On Windows, this may use `attrib.exe` to expand short (8.3) path segments, so the Windows
 * path expansion result is cached for performance.
 */
export function normalizedTmpdir(options: NormalizedTmpdirOptions = {}): string {
  const localConsole = options.console === true ? console : options.console;

  // For Mac: convert /var/... to /private/var/...
  let tmpdir = fs.realpathSync(os.tmpdir());

  // For Windows: if there's a short path segment, expand it
  if (os.platform() === "win32" && tmpdir.includes("~")) {
    if (!windowsLongTmpdirs.has(tmpdir)) {
      windowsLongTmpdirs.set(tmpdir, expandShortPath(tmpdir));
    }

    tmpdir = windowsLongTmpdirs.get(tmpdir) || tmpdir;

    if (tmpdir.includes("~") && localConsole) {
      localConsole.warn(
        `⚠️⚠️⚠️\nWARNING: temp directory "${tmpdir}" contains a short (8.3) path segment which ` +
          `could not be expanded by available heuristics. This may cause issues with tests ` +
          `or utilities which rely on path comparisons.\n⚠️⚠️⚠️`
      );
    }
  }

  return tmpdir;
}
