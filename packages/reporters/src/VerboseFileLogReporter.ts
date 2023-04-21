import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { isTargetStatusLogEntry } from "./isTargetStatusLogEntry.js";
import { LogLevel } from "@lage-run/logger";
import ansiRegex from "ansi-regex";
import type { Reporter, LogEntry } from "@lage-run/logger";
import type { SchedulerRunSummary, TargetStatus } from "@lage-run/scheduler-types";
import type { TargetMessageEntry, TargetStatusEntry } from "./types/TargetLogEntry.js";
import { Writable } from "stream";
import fs from "fs";

const stripAnsiRegex = ansiRegex();

function stripAnsi(message: string) {
  return message.replace(stripAnsiRegex, "");
}

export class VerboseFileLogReporter implements Reporter {
  fileStream: Writable;
  constructor(logFile?: string) {
    // if logFile is falsy (not specified on cli args), this.fileStream just become a "nowhere" stream and this reporter effectively does nothing
    this.fileStream = logFile ? fs.createWriteStream(logFile) : new Writable({ write() {} });
  }

  cleanup() {
    this.fileStream?.end();
  }

  log(entry: LogEntry<any>) {
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
      return this.print(`:::${entry.data?.target?.id}::: ${entry.msg}`);
    }
  }

  private printEntry(entry: LogEntry<any>, message: string) {
    let pkg = "";

    if (entry?.data?.target) {
      const { packageName } = entry.data.target;
      pkg = packageName ?? "<root>";
    }

    this.print(`${this.getEntryTargetId(entry)} ${pkg} ${message}`.trim());
  }

  private getEntryTargetId(entry: LogEntry<any>) {
    if (entry.data?.target?.id) {
      return `:::${entry.data?.target?.id}:::`;
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
      const statusMessages = {
        running: "➔ start",
        success: `✓ done - ${duration && formatDuration(hrToSeconds(duration))}`,
        failed: "✖ fail",
        skipped: `» skip - ${hash}`,
        aborted: "- aborted",
        queued: "… queued",
      };

      return this.printEntry(entry, statusMessages[status]);
    } else {
      const defaultMessage = `: ${stripAnsi(entry.msg)}`;
      return this.printEntry(entry, defaultMessage);
    }
  }

  summarize(_: SchedulerRunSummary) {
    // No summary needed for VerboseFileLogReporter
  }
}
