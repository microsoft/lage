import { formatDuration, hrToSeconds } from "@lage-run/format-hrtime";
import { Box, Text } from "ink";
import * as React from "react";
import { Progress } from "../types/progressBarTypes";

export interface ProgressStatusProps {
  progress: Progress;
}

export function ProgressStatus(props: ProgressStatusProps) {
  const { waiting, completed, total } = props.progress;
  const percentage = total > 0 ? `${((completed / total) * 100).toFixed(2)}%` : "0%";

  const status = `Waiting: ${waiting} | Completed: ${completed} | Total: ${total} | ${percentage}`;

  return (
    <Box>
      <Text>{status}</Text>
    </Box>
  );
}
