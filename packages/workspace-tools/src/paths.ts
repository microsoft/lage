import path from "path";
import fs from "fs";
import { getWorkspaceManagerRoot } from "./workspaces/getWorkspaceManagerRoot.js";
import { git } from "./git/index.js";
import { logVerboseWarning } from "./logging.js";
import type { WorkspaceManager } from "./types/WorkspaceManager.js";

/**
 * Starting from `cwd`, searches up the directory hierarchy for `filePath`.
 * If multiple strings are given, searches each directory level for any of them.
 * @returns Full path to the item found, or undefined if not found.
 */
export function searchUp(filePath: string | string[], cwd: string): string | undefined {
  const paths = typeof filePath === "string" ? [filePath] : filePath;
  // convert to an absolute path if needed
  cwd = path.resolve(cwd);
  const root = path.parse(cwd).root;

  let foundPath: string | undefined;

  while (!foundPath && cwd !== root) {
    foundPath = paths.find((p) => fs.existsSync(path.join(cwd, p)));
    if (foundPath) {
      break;
    }

    cwd = path.dirname(cwd);
  }

  return foundPath ? path.join(cwd, foundPath) : undefined;
}

/**
 * Starting from `cwd`, uses `git rev-parse --show-toplevel` to find the root of the git repo.
 * Throws if `cwd` is not in a Git repository.
 */
export function findGitRoot(cwd: string): string {
  const output = git(["rev-parse", "--show-toplevel"], { cwd });
  if (!output.success) {
    throw new Error(`Directory "${cwd}" is not in a git repository`);
  }

  return path.normalize(output.stdout);
}

/**
 * Starting from `cwd`, searches up the directory hierarchy for `package.json`.
 */
export function findPackageRoot(cwd: string): string | undefined {
  const jsonPath = searchUp("package.json", cwd);
  return jsonPath && path.dirname(jsonPath);
}

/**
 * Starting from `cwd`, searches up the directory hierarchy for the project root (workspace/monorepo
 * manager root), falling back to the git root if no manager root is detected. Results are cached by
 * `cwd`, and an error is thrown if no project root is found and it's not a git repo.
 *
 * To skip the git root fallback, use `getWorkspaceManagerRoot`. Usually the monorepo manager root
 * is the same as the git root, but this may not be the case with multiple "monorepos" in a single
 * git repo, or in project structures with multiple languages where the JS is not at the root.
 *
 * @param manager Optional workspace/monorepo manager to look for specifically
 */
export function findProjectRoot(cwd: string, manager?: WorkspaceManager): string {
  let workspaceRoot: string | undefined;
  try {
    workspaceRoot = getWorkspaceManagerRoot(cwd, manager);
    if (!workspaceRoot) {
      logVerboseWarning(`Could not find workspace manager root for ${cwd}. Falling back to git root.`);
    }
  } catch (err) {
    logVerboseWarning(`Error getting workspace manager root for ${cwd} (will fall back to git root)`, err);
  }

  return workspaceRoot || findGitRoot(cwd);
}

/**
 * Determines if `child` path is a subdirectory of `parent` path.
 */
export function isChildOf(child: string, parent: string): boolean {
  const relativePath = path.relative(child, parent);
  return /^[./\\]+$/.test(relativePath);
}
