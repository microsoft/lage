import { formatHrtime } from "./formatDuration.js";
import { isTargetLogEntry, isTargetStatusData } from "./isTargetLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import { Writable } from "stream";
import fs from "fs";
import path from "path";
import { formatMemoryUsage, stripAnsi } from "./formatHelpers.js";
import type { TargetLogEntry, MaybeTargetLogEntry, TargetReporter } from "./types/TargetReporter.js";

interface VerboseFileLogReporterOptions {
  /** Log file path from CLI args */
  logFile?: string;
  /** Whether to capture and report main process memory usage on target completion */
  logMemory?: boolean;
  /** Stream for testing (used instead of `logFile`) */
  fileStream?: Writable;
}

/**
 * Writes log entries to a file. It includes all log entries except "silly" level.
 */
export class VerboseFileLogReporter implements TargetReporter {
  private fileStream: Writable;
  private logMemory: boolean;

  constructor(options: VerboseFileLogReporterOptions);
  /** @deprecated use object params version */
  constructor(logFile?: string, fileStream?: Writable, logMemory?: boolean);
  constructor(fileOrOptions?: string | VerboseFileLogReporterOptions, _fileStream?: Writable, _logMemory?: boolean) {
    const options: VerboseFileLogReporterOptions =
      typeof fileOrOptions === "string" ? { logFile: fileOrOptions, logMemory: _logMemory, fileStream: _fileStream } : fileOrOptions || {};
    const { logFile } = options;

    this.logMemory = options.logMemory ?? false;
    if (logFile) {
      // make the parent directory if it doesn't exist
      fs.mkdirSync(path.dirname(path.resolve(logFile)), { recursive: true });
    }

    // if logFile is falsy (not specified on cli args), this.fileStream just become a "nowhere" stream and this reporter effectively does nothing
    this.fileStream = options.fileStream ?? (logFile ? fs.createWriteStream(logFile) : new Writable({ write() {} }));
  }

  public cleanup(): void {
    this.fileStream.end();
  }

  public log(entry: MaybeTargetLogEntry): void {
    const isTargetLog = isTargetLogEntry(entry);
    // if "hidden", do not even attempt to record or report the entry
    if (isTargetLog && entry.data.target.hidden) {
      return;
    }

    // if loglevel is not high enough, do not report the entry
    if (LogLevel.verbose < entry.level) {
      return;
    }

    // log normal target entries
    if (isTargetLog) {
      return this.logTargetEntry(entry);
    }

    // log generic entries (not related to target)
    if (entry.msg) {
      return this.print(`${entry.msg}`);
    }
  }

  private printEntry(entry: TargetLogEntry, message: string) {
    let packageAndTask = "";

    if (entry?.data?.target) {
      const { packageName, task } = entry.data.target;
      const pkg = packageName ?? "<root>";

      packageAndTask = `${pkg} ${task}`.trim();
    }

    this.print(`${this.getEntryTargetId(entry)} ${packageAndTask} ${message}`.trim());
  }

  private getEntryTargetId(entry: TargetLogEntry) {
    if (entry.data?.target?.id) {
      return `[:${entry.data.target.id}:]`;
    }

    return "";
  }

  private print(message: string) {
    this.fileStream.write(message + "\n");
  }

  private logTargetEntry(entry: TargetLogEntry) {
    const data = entry.data!;

    if (isTargetStatusData(data)) {
      const { hash, duration, status, memoryUsage } = data;
      const mem = formatMemoryUsage(memoryUsage, this.logMemory);

      switch (status) {
        case "running":
          return this.printEntry(entry, `➔ start`);

        case "success":
          return this.printEntry(entry, `✓ done - ${formatHrtime(duration!)}${mem}`);

        case "failed":
          return this.printEntry(entry, `✖ fail${mem}`);

        case "skipped":
          return this.printEntry(entry, `» skip - ${hash}${mem}`);

        case "aborted":
          return this.printEntry(entry, `- aborted`);

        case "queued":
          return this.printEntry(entry, `… queued`);

        case "pending":
          return this.printEntry(entry, `… pending`);

        default:
          throw new Error(`Internal error: unhandled target status "${status}"`);
      }
    }

    return this.printEntry(entry, `: ${stripAnsi(entry.msg)}`);
  }

  public summarize(): void {
    // No summary needed for VerboseFileLogReporter
  }
}
