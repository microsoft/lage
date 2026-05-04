import { git } from "./git.js";
import { type GitCommonOptions } from "./types.js";

/**
 * Get the value of a git config key. Returns null if it's not set.
 * (Note: setting `throwOnError: true` will cause it to fail if the key is unset.)
 */
export function getConfigValue(options: { key: string } & GitCommonOptions): string | null {
  const { key, ...gitOptions } = options;
  const results = git(["config", key], gitOptions);
  // command failure here just means it's not set
  return results.success ? results.stdout.trim() : null;
}

/**
 * Gets the user email from the git config.
 * (Note: setting `throwOnError: true` will cause it to fail if the key is unset.)
 *
 * @returns The email string if found, null otherwise
 */
export function getUserEmail(options: GitCommonOptions): string | null;
/** @deprecated Use object params version */
export function getUserEmail(cwd: string): string | null;
export function getUserEmail(cwdOrOptions: string | GitCommonOptions): string | null {
  const options: GitCommonOptions = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;
  return getConfigValue({ key: "user.email", ...options });
}

/**
 * Gets the default branch based on `git config init.defaultBranch`, falling back to `master`.
 * (Note: setting `throwOnError: true` will cause it to fail if the key is unset.)
 */
export function getDefaultBranch(options: GitCommonOptions): string;
/** @deprecated Use object params version */
export function getDefaultBranch(cwd: string): string;
export function getDefaultBranch(cwdOrOptions: string | GitCommonOptions): string {
  const options = typeof cwdOrOptions === "string" ? { cwd: cwdOrOptions } : cwdOrOptions;

  // Default to the legacy 'master' for backwards compat and old git clients
  return getConfigValue({ key: "init.defaultBranch", ...options }) || "master";
}
