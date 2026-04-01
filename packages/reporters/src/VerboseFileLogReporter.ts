import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import ansiRegex from "ansi-regex";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { TargetLogData } from "./types/TargetLogData.js";
import { Writable } from "stream";
import fs from "fs";
import path from "path";
import type { TargetStatus } from "@lage-run/scheduler-types";
import { formatBytes } from "./formatBytes.js";

const stripAnsiRegex = ansiRegex();

function stripAnsi(message: string) {
  return message.replace(stripAnsiRegex, "");
}

export class VerboseFileLogReporter implements Reporter {
  private fileStream: Writable;
  private logMemory: boolean;

  /**
   * @param logFile Log file path from CLI args
   * @param fileStream Stream for testing
   * @param logMemory Whether to log memory usage at task completion
   */
  constructor(logFile?: string, fileStream?: Writable, logMemory?: boolean) {
    this.logMemory = logMemory ?? false;
    // if logFile is falsy (not specified on cli args), this.fileStream just become a "nowhere" stream and this reporter effectively does nothing
    if (logFile) {
      const logFileDir = path.dirname(path.resolve(logFile));
      if (!fs.existsSync(logFileDir)) {
        fs.mkdirSync(logFileDir, { recursive: true });
      }
    }

    this.fileStream = fileStream ?? (logFile ? fs.createWriteStream(logFile) : new Writable({ write() {} }));
  }

  public cleanup(): void {
    this.fileStream.end();
  }

  public log(entry: LogEntry<any>): void {
    // if "hidden", do not even attempt to record or report the entry
    if (entry?.data?.target?.hidden) {
      return;
    }

    // if loglevel is not high enough, do not report the entry
    if (LogLevel.verbose < entry.level) {
      return;
    }

    // log normal target entries
    if (entry.data && entry.data.target) {
      return this.logTargetEntry(entry);
    }

    // log generic entries (not related to target)
    if (entry.msg) {
      return this.print(`${entry.msg}`);
    }
  }

  private printEntry(entry: LogEntry<any>, message: string) {
    let packageAndTask = "";

    if (entry?.data?.target) {
      const { packageName, task } = entry.data.target;
      const pkg = packageName ?? "<root>";

      packageAndTask = `${pkg} ${task}`.trim();
    }

    this.print(`${this.getEntryTargetId(entry)} ${packageAndTask} ${message}`.trim());
  }

  private getEntryTargetId(entry: LogEntry<any>) {
    if (entry.data?.target?.id) {
      return `[:${entry.data.target.id}:]`;
    }

    return "";
  }

  private print(message: string) {
    this.fileStream.write(message + "\n");
  }

  private formatMemory(memoryUsage?: NodeJS.MemoryUsage): string {
    if (!this.logMemory || !memoryUsage) {
      return "";
    }
    return ` [rss: ${formatBytes(memoryUsage.rss)}, heap: ${formatBytes(memoryUsage.heapUsed)}]`;
  }

  private logTargetEntry(entry: LogEntry<TargetLogData>) {
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { hash, duration, status, memoryUsage } = data;
      const mem = this.formatMemory(memoryUsage);
      const statusMessages: Record<TargetStatus, string> = {
        running: "➔ start",
        success: `✓ done - ${duration && formatDuration(hrToSeconds(duration))}${mem}`,
        failed: `✖ fail${mem}`,
        skipped: `» skip - ${hash}${mem}`,
        aborted: "- aborted",
        queued: "… queued",
        pending: "… pending",
      };

      return this.printEntry(entry, statusMessages[status]);
    }

    return this.printEntry(entry, `: ${stripAnsi(entry.msg)}`);
  }

  public summarize(): void {
    // No summary needed for VerboseFileLogReporter
  }
}
