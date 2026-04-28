import { git } from "./git.js";
import type { GitCommonOptions } from "./types.js";

/**
 * Reverts all local changes (both staged and unstaged) by stashing them and then dropping the stash.
 * @returns True if the revert was successful, false otherwise. It will also be false if there were
 * no changes to revert. (To distinguish between this case and errors, use the `throwOnError` option.)
 */
export function revertLocalChanges(options: GitCommonOptions): boolean;
/** @deprecated Use object params version */
export function revertLocalChanges(cwd: string): boolean;
export function revertLocalChanges(cwdOrOptions: string | GitCommonOptions): boolean {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  const stash = `workspace-tools_${new Date().getTime()}`;
  if (!git(["stash", "push", "-u", "-m", stash], options).success) {
    return false;
  }

  const results = git(["stash", "list"], options);
  if (results.success) {
    const matched = results.stdout
      .split(/\n/)
      .find((line) => line.includes(stash))
      ?.match(/^[^:]+/);

    if (matched) {
      git(["stash", "drop", matched[0]], options);
      return true;
    }
  }

  return false;
}
