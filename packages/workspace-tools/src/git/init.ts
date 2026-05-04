import { getConfigValue, getUserEmail } from "./config.js";
import { git } from "./git.js";
import type { GitInitOptions } from "./types.js";

/**
 * Run `git init` and verify that the `user.name` and `user.email` configs are set (at any level).
 * Throws an error if `git init` fails.
 *
 * If `user.email` and `user.name` aren't already set globally, and the missing value is provided
 * in params, set it at the repo level. Otherwise, throw an error.
 */
export function init(options: GitInitOptions): void;
/** @deprecated Use object params version */
export function init(cwd: string, email?: string, username?: string): void;
export function init(cwdOrOptions: string | GitInitOptions, _email?: string, _username?: string): void {
  const { email, username, ...options } =
    typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions, email: _email, username: _username } : cwdOrOptions;

  git(["init"], { ...options, throwOnError: true });

  if (!getConfigValue({ key: "user.name", ...options })) {
    if (!username) {
      throw new Error("must include a username when initializing git repo");
    }
    git(["config", "user.name", username], options);
  }

  if (!getUserEmail(options)) {
    if (!email) {
      throw new Error("must include a email when initializing git repo");
    }
    git(["config", "user.email", email], options);
  }
}
