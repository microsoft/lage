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
