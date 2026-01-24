import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import ansiRegex from "ansi-regex";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry.js";
import { Writable } from "stream";
import fs from "fs";
import path from "path";
import type { TargetStatus } from "@lage-run/scheduler-types";

const stripAnsiRegex = ansiRegex();

function stripAnsi(message: string) {
  return message.replace(stripAnsiRegex, "");
}

export class VerboseFileLogReporter implements Reporter {
  fileStream: Writable;
  constructor(logFile?: string) {
    // if logFile is falsy (not specified on cli args), this.fileStream just become a "nowhere" stream and this reporter effectively does nothing
    if (logFile) {
      const logFilePath = path.dirname(path.resolve(logFile));
      if (!fs.existsSync(logFilePath)) {
        fs.mkdirSync(logFilePath, { recursive: true });
      }
    }

    this.fileStream = logFile ? fs.createWriteStream(logFile) : new Writable({ write() {} });
  }

  cleanup(): void {
    this.fileStream?.end();
  }

  log(entry: LogEntry<any>): void {
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
    this.fileStream?.write(message + "\n");
  }

  private logTargetEntry(entry: LogEntry<TargetStatusEntry | TargetMessageEntry>) {
    const data = entry.data!;

    if (isTargetStatusLogEntry(data)) {
      const { hash, duration, status } = data;
      const statusMessages: Record<TargetStatus, string> = {
        running: "➔ start",
        success: `✓ done - ${duration && formatDuration(hrToSeconds(duration))}`,
        failed: "✖ fail",
        skipped: `» skip - ${hash}`,
        aborted: "- aborted",
        queued: "… queued",
        pending: "… pending",
      };

      return this.printEntry(entry, statusMessages[status]);
    } else {
      const defaultMessage = `: ${stripAnsi(entry.msg)}`;
      return this.printEntry(entry, defaultMessage);
    }
  }

  summarize(): void {
    // No summary needed for VerboseFileLogReporter
  }
}
