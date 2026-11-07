import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

/**
 * Supported on Windows only: expand an absolute path with short (8.3) segments to a long path.
 * The path MUST exist on the local filesystem and be accessible to the user.
 *
 * If the user name is the only short segment, and `shortPath` is under `os.homedir()` (which must
 * not include any short segments), uses `os.homedir()` as a replacement for the short part.
 * Otherwise, expands each short segment of the path using `attrib.exe`.
 *
 * Note that this function does NOT cache its results. If you might be calling it more than once
 * for the same path, it's recommended to cache the results yourself.
 *
 * @param shortPath Absolute Windows path, possibly with one or more short (8.3) segments
 *
 * @returns The expanded path, or the original path if's an absolute local Windows path with no
 * short segments. Returns false if not on Windows, it's an unsupported path type (network,
 * relative, non-Windows), the path doesn't exist, or there's an error expanding any segment.
 */
export function expandShortPath(shortPath: string): string | false {
  if (os.platform() !== "win32" || !/^[a-z]:\\/i.test(shortPath) || !fs.existsSync(shortPath)) {
    // Wrong platform, unsupported path type (network, relative, non-Windows), or doesn't exist
    return false;
  }
  if (!shortPath.includes("~")) {
    // not actually a short path
    return shortPath;
  }

  // First (to avoid spawning a process), try using os.homedir() to replace a short user directory
  // segment in shortPath. This only works if:
  // - shortPath is under the home directory
  // - the user directory name is the only short segment
  // - the home directory variable isn't defined with a short path
  //
  // 1 = path up to user directory, 2 = rest of path
  const userDirMatch = shortPath.match(/^([a-z]:\\Users\\[^\\]+)(.*)/i);
  if (userDirMatch && userDirMatch[1].includes("~") && !userDirMatch[2].includes("~")) {
    const homedir = os.homedir();
    // To verify that the short user directory part of shortPath is the home directory,
    // compare the inode numbers (pretty sure this will work).
    try {
      if (!homedir.includes("~") && fs.statSync(userDirMatch[1]).ino === fs.statSync(homedir).ino) {
        return shortPath.replace(userDirMatch[1], homedir);
      }
    } catch {
      // try next method
    }
  }

  // Otherwise, (mis)use attrib.exe to expand the path: while its intended use is to get/set file
  // attributes, it also appears to always expand the last path segment into a long path.
  const segments = shortPath.split("\\");
  for (let i = 1; i < segments.length; i++) {
    if (!segments[i].includes("~")) {
      continue;
    }

    try {
      // Given input like C:\Users\VERYLO~1, attrib returns output like:
      //                    C:\Users\verylongusername
      // (possibly with one or more letters at the start indicating file/dir attributes)
      // But it will only expand the last segment in the path, so we need to iterate through.
      const partialShortPath = segments.slice(0, i + 1).join("\\");
      // The complete short path was validated to exist at the beginning of this function, so any
      // parent segments should also exist and be valid input.
      const attribResult = child_process.spawnSync("attrib.exe", [partialShortPath]).stdout.toString().trim();

      // attrib doesn't exit with an error code for bad paths, so check for errors like:
      // File not found - C:\badname
      const expandedMatch = attribResult.match(/(?<!- )[a-z]:\\.*/i);

      if (expandedMatch && path.dirname(expandedMatch[0].toLowerCase()) === path.dirname(partialShortPath.toLowerCase())) {
        segments[i] = path.basename(expandedMatch[0]);
      } else {
        // Bail on any issues to avoid inaccurate results
        return false;
      }
    } catch {
      return false;
    }
  }

  // one last check to make sure it's valid
  const result = segments.join("\\");
  return fs.existsSync(result) ? result : false;
}
