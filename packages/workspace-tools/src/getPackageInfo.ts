import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import type { PackageInfo } from "./types/PackageInfo.js";
import { logVerboseWarning } from "./logging.js";

/**
 * Read package.json from the given path if it exists.
 *
 * @returns The package info, or undefined if it doesn't exist or can't be read.
 * (Logs verbose warnings instead of throwing on error.)
 */
export function getPackageInfo(cwd: string): PackageInfo | undefined {
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return { ...packageJson, packageJsonPath };
  } catch (e) {
    logVerboseWarning(
      fs.existsSync(packageJsonPath)
        ? `Error reading or parsing ${packageJsonPath}: ${(e as Error)?.message || e}`
        : `File does not exist: ${packageJsonPath}`
    );
  }
}

/**
 * Read package.json from the given path if it exists.
 *
 * @returns The package info, or undefined if it doesn't exist or can't be read.
 * (Logs verbose warnings instead of throwing on error.)
 */
export async function getPackageInfoAsync(cwd: string): Promise<PackageInfo | undefined> {
  const packageJsonPath = path.join(cwd, "package.json");
  try {
    const packageJson = JSON.parse(await fsPromises.readFile(packageJsonPath, "utf-8"));
    return { ...packageJson, packageJsonPath };
  } catch (e) {
    logVerboseWarning(
      fs.existsSync(packageJsonPath)
        ? `Error reading or parsing ${packageJsonPath}: ${(e as Error)?.message || e}`
        : `File does not exist: ${packageJsonPath}`
    );
  }
}
