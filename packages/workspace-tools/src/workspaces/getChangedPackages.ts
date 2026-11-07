import {
  getChangesBetweenRefs,
  getDefaultRemoteBranch,
  getStagedChanges,
  getUnstagedChanges,
  getUntrackedChanges,
} from "../git/index.js";
import { type GitCommonOptions, type GetChangesBetweenRefsOptions } from "../git/types.js";
import { getPackagesByFiles } from "./getPackagesByFiles.js";

type GetChangedPackagesOptions = GitCommonOptions & {
  /** The `merge-base` branch (must have been fetched locally) */
  target?: string;
  /** Glob patterns to ignore */
  ignoreGlobs?: string[];
  /** If true (the default), return all packages if no matches are found for any file. */
  returnAllPackagesOnNoMatch?: boolean;
};

type GetChangedPackagesBetweenRefsOptions = Omit<GetChangedPackagesOptions, "target"> &
  Pick<GetChangesBetweenRefsOptions, "fromRef" | "toRef">;

/**
 * Finds all packages that had been changed between two refs in the repo under cwd,
 * by executing `git diff $fromRef...$toRef`.
 *
 * **NOTE: The new object params version will throw if any of the git operations error.**
 * Disabling this behavior is not recommended due to the potential for hiding other issues,
 * but can be done by setting `throwOnError: false` in the options.
 *
 * Note that by default, if a repo-wide file such as the root package.json has changed,
 * all packages are assumed to have changed. (This is highly lage-specific behavior.)
 * Disable by setting `returnAllPackagesOnNoMatch` to `false`.
 *
 * Explanation of the three dots:
 *
 * ```txt
 * git diff [--options] <commit>...<commit> [--] [<path>...]
 *
 *   This form is to view the changes on the branch containing and up to
 *   the second <commit>, starting at a common ancestor of both
 *   <commit>. "git diff A...B" is equivalent to "git diff
 *   $(git-merge-base A B) B". You can omit any one of <commit>, which
 *   has the same effect as using HEAD instead.
 * ```
 *
 * @returns list of package names that have changed
 */
export function getChangedPackagesBetweenRefs(params: GetChangedPackagesBetweenRefsOptions): string[];
/** @deprecated Use object params version */
export function getChangedPackagesBetweenRefs(
  cwd: string,
  fromRef: string,
  toRef?: string,
  ignoreGlobs?: string[],
  returnAllPackagesOnNoMatch?: boolean
): string[];
export function getChangedPackagesBetweenRefs(
  paramsOrCwd: GetChangedPackagesBetweenRefsOptions | string,
  _fromRef?: string,
  _toRef?: string,
  _ignoreGlobs?: string[],
  _returnAllPackagesOnNoMatch?: boolean
): string[] {
  const params: GetChangedPackagesBetweenRefsOptions =
    typeof paramsOrCwd === "string"
      ? {
          cwd: paramsOrCwd,
          fromRef: _fromRef!,
          toRef: _toRef,
          ignoreGlobs: _ignoreGlobs,
          returnAllPackagesOnNoMatch: _returnAllPackagesOnNoMatch,
        }
      : paramsOrCwd;
  const { fromRef, toRef, ignoreGlobs, returnAllPackagesOnNoMatch = true, ...gitOptions } = params;
  gitOptions.throwOnError ??= true;

  const changes = [
    ...new Set([
      ...getUntrackedChanges(gitOptions),
      ...getUnstagedChanges(gitOptions),
      ...getChangesBetweenRefs({ fromRef, toRef, ...gitOptions }),
      ...getStagedChanges(gitOptions),
    ]),
  ];

  return getPackagesByFiles({
    root: gitOptions.cwd,
    files: changes,
    ignoreGlobs,
    returnAllPackagesOnNoMatch,
  });
}

/**
 * Finds all packages that had been changed in the repo under cwd, by executing
 * `git diff $target...`.
 *
 * **NOTE: The new object params version will throw if any of the git operations error.**
 * Disabling this behavior is not recommended due to the potential for hiding other issues,
 * but can be done by setting `throwOnError: false` in the options.
 *
 * Note that by default, if a repo-wide file such as the root package.json has changed,
 * all packages are assumed to have changed. (This is highly lage-specific behavior.)
 * Disable by setting `returnAllPackagesOnNoMatch` to `false`.
 *
 * Explanation of the three dots:
 *
 * ```txt
 * git diff [--options] <commit>...<commit> [--] [<path>...]
 *
 *   This form is to view the changes on the branch containing and up to
 *   the second <commit>, starting at a common ancestor of both
 *   <commit>. "git diff A...B" is equivalent to "git diff
 *   $(git-merge-base A B) B". You can omit any one of <commit>, which
 *   has the same effect as using HEAD instead.
 * ```
 *
 * @returns list of package names that have changed
 */
export function getChangedPackages(params: GetChangedPackagesOptions): string[];
/** @deprecated Use object params version */
export function getChangedPackages(
  cwd: string,
  target?: string,
  ignoreGlobs?: string[],
  returnAllPackagesOnNoMatch?: boolean
): string[];
export function getChangedPackages(
  cwdOrOptions: string | GetChangedPackagesOptions,
  target?: string,
  ignoreGlobs?: string[],
  returnAllPackagesOnNoMatch?: boolean
): string[] {
  let gitOptions: GitCommonOptions;
  if (typeof cwdOrOptions === "string") {
    gitOptions = { cwd: cwdOrOptions };
  } else {
    ({ target, ignoreGlobs, returnAllPackagesOnNoMatch, ...gitOptions } = cwdOrOptions);
  }
  gitOptions.throwOnError ??= true;

  const targetBranch = target || getDefaultRemoteBranch(gitOptions);

  return getChangedPackagesBetweenRefs({
    fromRef: targetBranch,
    ...gitOptions,
    ignoreGlobs,
    returnAllPackagesOnNoMatch,
  });
}
