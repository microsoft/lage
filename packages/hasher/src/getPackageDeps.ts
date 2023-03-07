import { gitHash } from "./gitHash.js";

/**
 * Builds an object containing hashes for the files under the specified `packagePath` folder.
 * @param packagePath - The folder path to derive the package dependencies from. This is typically the folder
 *                      containing package.json.  If omitted, the default value is the current working directory.
 * @param gitPath     - Optional param to specify the path to the git executable.
 * @returns the package-deps.json file content
 *
 * @public
 */
export async function getPackageDeps(packagePath: string = process.cwd(), gitPath?: string): Promise<Map<string, string>> {
  return await gitHash(packagePath, undefined, gitPath);
}
