import { git } from "./git.js";
import type { GitCommitOptions, GitStageOptions } from "./types.js";

/**
 * Stages files matching the given patterns.
 */
export function stage(options: GitStageOptions): void;
/** @deprecated Use object params version */
export function stage(patterns: string[], cwd: string): void;
export function stage(patternsOrOptions: string[] | GitStageOptions, cwd?: string): void {
  const { patterns, ...options } = Array.isArray(patternsOrOptions)
    ? { patterns: patternsOrOptions, cwd: cwd! }
    : patternsOrOptions;

  for (const pattern of patterns) {
    git(["add", pattern], { ...options, description: `Staging changes (git add ${pattern})` });
  }
}

/**
 * Commit changes. Throws an error on failure by default.
 */
export function commit(options: GitCommitOptions): void;
/** @deprecated Use object params version */
export function commit(message: string, cwd: string, options?: string[]): void;
export function commit(messageOrOptions: string | GitCommitOptions, _cwd?: string, _options?: string[]): void {
  const { message, options, ...gitOptions } =
    typeof messageOrOptions === "string"
      ? { message: messageOrOptions, cwd: _cwd!, options: _options }
      : messageOrOptions;

  git(["commit", "-m", message, ...(options || [])], {
    throwOnError: true,
    description: "Committing changes",
    ...gitOptions,
  });
}

/**
 * Stages files matching the given patterns and creates a commit with the specified message.
 * Convenience function that combines `stage()` and `commit()`.
 * Throws an error on commit failure by default.
 */
export function stageAndCommit(options: GitStageOptions & GitCommitOptions): void;
/** @deprecated Use object params version */
export function stageAndCommit(patterns: string[], message: string, cwd: string, commitOptions?: string[]): void;
export function stageAndCommit(
  patternsOrOptions: string[] | (GitStageOptions & GitCommitOptions),
  message?: string,
  cwd?: string,
  commitOptions?: string[]
): void {
  const options: GitStageOptions & GitCommitOptions = Array.isArray(patternsOrOptions)
    ? { patterns: patternsOrOptions, message: message!, cwd: cwd!, options: commitOptions }
    : patternsOrOptions;

  stage(options);
  commit(options);
}
