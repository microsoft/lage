import type { LogEntry, Reporter } from "@lage-run/logger";
import { LogLevel } from "@lage-run/logger";
import type { SchedulerRunSummary } from "@lage-run/scheduler-types";

import * as React from "react";
import { Box, Text, render, Newline } from "ink";
import EventEmitter from "events";
import { hrtimeDiff, hrToSeconds, formatDuration } from "@lage-run/format-hrtime";

interface Progress {
  waiting: number;
  completed: number;
  total: number;
}

interface ThreadInfo {
  [threadId: string]: string;
}

interface SummaryWithLogs {
  schedulerRunSummary: SchedulerRunSummary;
  logEntries: Map<string, LogEntry[]>;
}

function ProgressStatus(props: { progress: Progress }) {
  const { waiting, completed, total } = props.progress;
  const percentage = total > 0 ? `${((completed / total) * 100).toFixed(2)}%` : "0%";

  const status = `Waiting: ${waiting} | Completed: ${completed} | Total: ${total} | ${percentage}`;

  return (
    <Box>
      <Text>{status}</Text>
    </Box>
  );
}

function ThreadItem(props: { targetId: string }) {
  const { targetId } = props;
  return <Box>{targetId ? <Text color="whiteBright">[ {targetId} ]</Text> : <Text color="gray">[ IDLE ]</Text>}</Box>;
}

function SummaryInfo(props: { summary: SummaryWithLogs }) {
  const { summary } = props;
  const { schedulerRunSummary, logEntries } = summary;
  const { targetRunByStatus, targetRuns, duration } = schedulerRunSummary;

  const slowestTargetRuns = [...targetRuns.values()].sort((a, b) => parseFloat(hrToSeconds(hrtimeDiff(a.duration, b.duration))));
  const { failed, aborted, skipped, success, pending } = targetRunByStatus;

  const errors =
    failed && failed.length > 0
      ? new Map<string, LogEntry<any>[]>(failed.map((targetId) => [targetId, logEntries.get(targetId) || []]))
      : new Map();

  return (
    <Box flexDirection="column">
      <Text color="greenBright">Summary</Text>
      <Newline />
      <Text color="yellow">Slowest targets</Text>

      <Box flexDirection="column" marginLeft={2} marginY={1}>
        {slowestTargetRuns
          .slice(0, 10)
          .filter((run) => !run.target.hidden)
          .map((targetRun) => (
            <Text key={targetRun.target.id}>
              {targetRun.target.id} - {formatDuration(hrToSeconds(targetRun.duration))}
            </Text>
          ))}
      </Box>

      {errors.size > 0 ? <ErrorMessages errors={errors} /> : null}

      <Text>{`success: ${success.length}, skipped: ${skipped.length}, pending: ${pending.length}, aborted: ${aborted.length}, failed: ${failed.length}`}</Text>
      <Text>Took a total of {formatDuration(hrToSeconds(duration))} to complete.</Text>
    </Box>
  );
}

function ErrorMessages(props: { errors: Map<string, LogEntry<any>[]> }) {
  const { errors } = props;

  return (
    <Box flexDirection="column">
      <Text color="redBright">Errors</Text>
      <Box flexDirection="column" marginLeft={2} marginY={1}>
        {[...errors.entries()].map(([targetId, logs]) => (
          <Box flexDirection="column" key={`errorlogs-${targetId}`} marginBottom={1}>
            <Text color="cyanBright" underline bold>{targetId}</Text>
            <Text>{logs.map((entry) => entry.msg).join("\n")}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function ReporterApp(props: { logEvent: EventEmitter; concurrency: number }) {
  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo>({});
  const [progress, setProgress] = React.useState({
    waiting: 0,
    completed: 0,
    total: 0,
  });
  const [summary, setSummary] = React.useState<SummaryWithLogs | undefined>();

  const { logEvent } = props;

  React.useEffect(() => {
    logEvent.on("status", (entry: LogEntry<any>) => {
      const { target, threadId, status } = entry.data;

      if (status && status === "running") {
        setThreadInfo((threadInfo) => ({
          ...threadInfo,
          [threadId]: target.id,
        }));
      } else if (status === "success" || status === "aborted" || status === "failed") {
        setThreadInfo((threadInfo) => {
          const newThreadInfo = { ...threadInfo };
          newThreadInfo[threadId] = "";

          return newThreadInfo;
        });
      }
    });

    logEvent.on("progress", (progress: Progress) => {
      setProgress(progress);
    });

    logEvent.on("summary", (summary: SummaryWithLogs) => {
      setSummary(summary);
    });
  }, [logEvent]);

  const arrayGapLength = props.concurrency - Object.keys(threadInfo).length;
  const idleWorkerDummyThreadInfo = arrayGapLength > 0 ? new Array(arrayGapLength).fill(0) : [];
  return (
    <Box flexDirection="column">
      <Text>Lage running tasks</Text>
      <Text color="yellow">[warning: this progress reporter is currently in beta and unstable]</Text>
      {summary ? (
        <SummaryInfo summary={summary} />
      ) : (
        <Box flexDirection="column">
          <Box flexDirection="column" marginLeft={2} marginY={1}>
            {Object.entries<string>(threadInfo).map(([threadId, targetId]) => {
              return <ThreadItem key={threadId} targetId={targetId} />;
            })}
            {idleWorkerDummyThreadInfo.map((_, index) => {
              return (
                <React.Fragment key={`idle-${index}`}>
                  <ThreadItem targetId={""} />
                </React.Fragment>
              );
            })}
          </Box>
          <ProgressStatus progress={progress} />
        </Box>
      )}
    </Box>
  );
}

export class ProgressReporter implements Reporter {
  logEvent: EventEmitter = new EventEmitter();
  logEntries = new Map<string, LogEntry[]>();

  constructor(options: { concurrency: number } = { concurrency: 0 }) {
    render(<ReporterApp logEvent={this.logEvent} concurrency={options.concurrency} />);
  }

  log(entry: LogEntry<any>) {
    // save the logs for errors
    if (entry.data?.target?.id) {
      if (!this.logEntries.has(entry.data.target.id)) {
        this.logEntries.set(entry.data.target.id, []);
      }
      this.logEntries.get(entry.data.target.id)!.push(entry);
    }

    // if "hidden", do not even attempt to record or report the entry
    if (entry?.data?.target?.hidden) {
      return;
    }

    if (entry.data && entry.data.target && typeof entry.data.threadId !== "undefined") {
      this.logEvent.emit("status", entry);
    }

    if (entry.data && entry.data.progress) {
      this.logEvent.emit("progress", entry.data.progress);
    }
  }

  summarize(schedulerRunSummary: SchedulerRunSummary) {
    this.logEvent.emit("summary", { schedulerRunSummary, logEntries: this.logEntries });
  }
}
