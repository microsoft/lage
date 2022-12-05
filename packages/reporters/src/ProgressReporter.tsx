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

function ProgressStatus(props: { progress: Progress }) {
  const { progress } = props;

  return (
    <Box>
      <Text>
        Waiting: {progress.waiting} | Completed: {progress.completed} | Total: {progress.total}{" "}
        {progress.total > 0 ? `${((progress.completed / progress.total) * 100).toFixed(2)}%` : "0%"}
      </Text>
    </Box>
  );
}

function ThreadItem(props: { threadId: string; targetId: string }) {
  const { targetId, threadId } = props;

  return (
    <Box>
      <Text>
        {threadId} - {targetId}
      </Text>
    </Box>
  );
}

function SummaryInfo(props: { summary: SchedulerRunSummary }) {
  const { summary } = props;
  const slowestTargetRuns = [...summary.targetRuns.values()].sort((a, b) => parseFloat(hrToSeconds(hrtimeDiff(a.duration, b.duration))));

  return (
    <Box flexDirection="column">
      <Text>Summary</Text>
      
      <Text>Slowest targets</Text>
      {slowestTargetRuns
        .slice(0, 10)
        .filter((run) => !run.target.hidden)
        .map((targetRun) => (
          <Text key={targetRun.target.id}>
            {targetRun.target.id} - {formatDuration(hrToSeconds(targetRun.duration))}
          </Text>
        ))}

      <Text>Total time: {formatDuration(hrToSeconds(summary.duration))}</Text>
    </Box>
  );
}



function ReporterApp(props: { logEvent: EventEmitter, concurrency: number }) {
  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo>({});
  const [progress, setProgress] = React.useState({
    waiting: 0,
    completed: 0,
    total: 0,
  });
  const [summary, setSummary] = React.useState<SchedulerRunSummary | undefined>();

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

    logEvent.on("summary", (summary: SchedulerRunSummary) => {
      setSummary(summary);
    });
  }, [logEvent]);

  return (
    <Box flexDirection="column">
      {summary ? (
        <SummaryInfo summary={summary} />
      ) : (
        <React.Fragment>
          {Object.keys(threadInfo).length > 0 ? <Text>Workers</Text> : null}
          {Object.entries<string>(threadInfo).map(([threadId, targetId]) => {
            return <ThreadItem key={threadId} threadId={threadId} targetId={targetId} />;
          })}

          <Newline />
          <ProgressStatus progress={progress} />
        </React.Fragment>
      )}
    </Box>
  );
}

export class ProgressReporter implements Reporter {
  logEvent: EventEmitter = new EventEmitter();

  constructor(private options: { concurrency: number } = { concurrency: 0 }) {
    render(<ReporterApp logEvent={this.logEvent} concurrency={options.concurrency} />);
  }

  log(entry: LogEntry<any>) {
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
    this.logEvent.emit("summary", schedulerRunSummary);
  }
}
