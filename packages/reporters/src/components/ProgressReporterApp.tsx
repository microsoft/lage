import type { LogEntry } from "@lage-run/logger";
import type EventEmitter from "events";
import { Box, Text } from "ink";
import * as React from "react";
import type { Progress, SummaryWithLogs, ThreadInfo } from "../types/progressBarTypes";
import { ProgressStatus } from "./ProgressStatus";
import { SummaryInfo } from "./SummaryInfo";
import { ThreadItem } from "./ThreadItem";

export interface ProgressReporterAppProps {
  logEvent: EventEmitter;
  concurrency: number;
}

export function ProgressReporterApp(props: ProgressReporterAppProps) {
  const initialThreadInfo: ThreadInfo = new Set();

  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo>(initialThreadInfo);
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

      if (status === "running") {
        setThreadInfo((threadInfo) => new Set(threadInfo).add(target.id));
      } else if (status === "success" || status === "aborted" || status === "failed" || status === "skipped") {
        setThreadInfo((threadInfo) => {
          const newSet = new Set(threadInfo);
          newSet.delete(target.id);
          return newSet;
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

  const limit = 16;
  const hasMore = Object.keys(threadInfo).length > limit;

  return (
    <Box flexDirection="column">
      <Text>Lage running tasks with {props.concurrency} workers</Text>
      {summary ? (
        <SummaryInfo summary={summary} />
      ) : (
        <Box flexDirection="column">
          <ProgressStatus progress={progress} />
          <Box flexDirection="column" marginLeft={2} marginY={1}>
            {[...threadInfo].slice(Math.max(0, threadInfo.size - limit)).map((targetId) => (
              <ThreadItem key={targetId} targetId={targetId} />
            ))}
          </Box>

          {hasMore && <Text>... and {Object.keys(threadInfo).length - limit} more</Text>}
        </Box>
      )}
    </Box>
  );
}
