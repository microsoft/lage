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

function range(len: number) {
  return Array(len)
    .fill(0)
    .map((_, idx) => idx + 1);
}

export function ProgressReporterApp(props: ProgressReporterAppProps) {
  const initialThreadInfo = range(props.concurrency).reduce((acc, threadId) => {
    acc[threadId] = "";
    return acc;
  }, {});

  const [threadInfo, setThreadInfo] = React.useState<ThreadInfo>(initialThreadInfo);
  const [progress, setProgress] = React.useState({
    waiting: 0,
    completed: 0,
    total: 0,
  });
  const [summary, setSummary] = React.useState<SummaryWithLogs | undefined>();
  const [currentTime, setCurrentTime] = React.useState<[number, number]>([0, 0]);

  const { logEvent } = props;

  React.useEffect(() => {
    logEvent.on("status", (entry: LogEntry<any>) => {
      const { target, threadId, status } = entry.data;

      if (status && status === "running") {
        setThreadInfo((threadInfo) => ({
          ...threadInfo,
          [threadId]: target.id,
        }));
      } else if (status === "success" || status === "aborted" || status === "failed" || status === "skipped") {
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

    logEvent.on("heartbeat", (heartbeat: { currentTime: [number, number] }) => {
      setCurrentTime(heartbeat.currentTime);
    });
  }, [logEvent]);

  const arrayGapLength = props.concurrency - Object.keys(threadInfo).length;
  const idleWorkerDummyThreadInfo = arrayGapLength > 0 ? new Array(arrayGapLength).fill(0) : [];

  return (
    <Box flexDirection="column">
      <Text>Lage running tasks with {props.concurrency} workers</Text>
      {summary ? (
        <SummaryInfo summary={summary} />
      ) : (
        <Box flexDirection="column">
          <Box flexDirection="column" marginLeft={2} marginY={1}>
            {Object.entries<string>(threadInfo).map(([threadId, targetId]) => {
              return <ThreadItem key={threadId} threadId={threadId} targetId={targetId} />;
            })}
            {idleWorkerDummyThreadInfo.map((_, index) => {
              return (
                <React.Fragment key={`idle-${index}`}>
                  <ThreadItem threadId={"?"} targetId={""} />
                </React.Fragment>
              );
            })}
          </Box>
          <ProgressStatus progress={progress} currentTime={currentTime} />
        </Box>
      )}
    </Box>
  );
}
