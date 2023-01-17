import { formatDuration, hrtimeDiff, hrToSeconds } from '@lage-run/format-hrtime';
import { LogEntry } from '@lage-run/logger';
import { Box, Newline, Text } from 'ink';
import * as React from 'react';
import { slowestTargetRuns } from '../slowestTargetRuns';
import type { SummaryWithLogs } from '../types/progressBarTypes';
import { ErrorMessages } from './ErrorMessages';

export interface SummaryInfoProps {
  summary: SummaryWithLogs
}

export function SummaryInfo(props: SummaryInfoProps) {
  const { summary } = props;
  const { schedulerRunSummary, logEntries } = summary;
  const { targetRunByStatus, targetRuns, duration } = schedulerRunSummary;

  const slowestTargets = slowestTargetRuns([...targetRuns.values()]);
  
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
        {slowestTargets
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