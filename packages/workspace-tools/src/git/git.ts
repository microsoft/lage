//
// Basic git wrappers
//

import { spawnSync, type SpawnSyncOptions, type SpawnSyncReturns } from "child_process";
import { type GitCommonOptions } from "./types.js";

export type GitOptions = Omit<SpawnSyncOptions, "cwd"> &
  GitCommonOptions & {
    /** Operation description to be used in error message (formatted as start of sentence) */
    description?: string;
    debug?: boolean;
  };

export class GitError extends Error {
  public readonly originalError: unknown;
  public readonly gitOutput?: GitProcessOutput;

  constructor(message: string, originalError?: unknown, gitOutput?: GitProcessOutput) {
    if (originalError instanceof Error) {
      super(`${message}: ${originalError.message}`);
    } else if (gitOutput?.stderr) {
      super(`${message} -- stderr:\n${gitOutput.stderr}`);
    } else {
      super(message);
    }
    this.originalError = originalError;
    this.gitOutput = gitOutput;
  }
}

/**
 * A global maxBuffer override for all git operations.
 * Bumps up the default to 500MB instead of 1MB.
 * Override this value with the `GIT_MAX_BUFFER` environment variable.
 */
const defaultMaxBuffer = process.env.GIT_MAX_BUFFER ? parseInt(process.env.GIT_MAX_BUFFER) : 500 * 1024 * 1024;

const isDebug = !!process.env.GIT_DEBUG;

export type GitProcessOutput = {
  stderr: string;
  stdout: string;
  success: boolean;
} & Omit<SpawnSyncReturns<string | Buffer>, "stdout" | "stderr">;

/** Observes the git operations called from `git()` or `gitFailFast()` */
export type GitObserver = (args: string[], output: GitProcessOutput) => void;
const observers: GitObserver[] = [];
let observing: boolean;

/**
 * Adds an observer for the git operations, e.g. for testing
 * @returns a function to remove the observer
 */
export function addGitObserver(observer: GitObserver): () => void {
  observers.push(observer);
  return () => removeGitObserver(observer);
}

/** Clear all git observers */
export function clearGitObservers(): void {
  observers.splice(0, observers.length);
}

/** Remove a git observer */
function removeGitObserver(observer: GitObserver): void {
  const index = observers.indexOf(observer);
  if (index > -1) {
    observers.splice(index, 1);
  }
}

/**
 * Runs git command - use this for read-only commands, or if you'd like to explicitly check the
 * result and implement custom error handling.
 *
 * The caller is responsible for validating the input.
 * `shell` will always be set to false.
 */
export function git(args: string[], options?: GitOptions): GitProcessOutput {
  if (args.some((arg) => arg.startsWith("--upload-pack"))) {
    // This is a security issue and not needed for any expected usage of this library.
    throw new GitError("git command contains --upload-pack, which is not allowed: " + args.join(" "));
  }

  const gitDescription = `git ${args.join(" ")}`;
  const { throwOnError, description = gitDescription, debug = isDebug, ...spawnOptions } = options || {};

  debug && console.log(gitDescription);

  let results: SpawnSyncReturns<string | Buffer>;
  try {
    // this only throws if git isn't found or other rare cases
    results = spawnSync("git", args, { maxBuffer: defaultMaxBuffer, ...spawnOptions });
  } catch (e) {
    throw new GitError(`${description} failed (while spawning process)`, e);
  }

  const output: GitProcessOutput = {
    ...results,
    // these may be undefined if stdio: inherit is set
    stderr: (results.stderr || "").toString().trimEnd(),
    stdout: (results.stdout || "").toString().trimEnd(),
    success: results.status === 0,
  };

  if (debug) {
    console.log("exited with code " + results.status);
    output.stdout && console.log("git stdout:\n", output.stdout);
    output.stderr && console.warn("git stderr:\n", output.stderr);
  }

  // notify observers, flipping the observing bit to prevent infinite loops
  if (!observing) {
    observing = true;
    for (const observer of observers) {
      observer(args, output);
    }
    observing = false;
  }

  if (!output.success && throwOnError) {
    throw new GitError(`${description} failed${output.stderr ? `\n${output.stderr}` : ""}`, undefined, output);
  }

  return output;
}

/**
 * Run a git command. Use this for commands that make critical changes to the filesystem.
 * If it fails, throw an error and set `process.exitCode = 1` (unless `options.noExitCode` is set).
 *
 * The caller is responsible for validating the input.
 * `shell` will always be set to false.
 */
export function gitFailFast(args: string[], options?: GitCommonOptions & { noExitCode?: boolean }): void {
  const gitResult = git(args, options);
  if (!gitResult.success) {
    if (!options?.noExitCode) {
      process.exitCode = 1;
    }

    throw new GitError(`CRITICAL ERROR: running git command: git ${args.join(" ")}!
    ${gitResult.stdout?.toString().trimEnd()}
    ${gitResult.stderr?.toString().trimEnd()}`);
  }
}

/**
 * Processes git command output by splitting it into lines and filtering out empty lines.
 * Also filters out `node_modules` lines if specified in options.
 *
 * If the command failed with stderr output, an error is thrown.
 *
 * @param output - The git command output to process
 * @returns An array of lines (presumably file paths), or an empty array if the command failed
 * without stderr output.
 * @internal
 */
export function processGitOutput(output: GitProcessOutput, options?: { excludeNodeModules?: boolean }): string[] {
  if (!output.success) {
    // If the intent was to throw on failure, `throwOnError` should have been set for the git command.
    return [];
  }

  return output.stdout
    .split(/\n/)
    .map((line) => line.trim())
    .filter((line) => !!line && (!options?.excludeNodeModules || !line.includes("node_modules")));
}
