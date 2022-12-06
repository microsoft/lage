import type { LogEntry } from "@lage-run/logger";
import * as React from "react";
import { Box, Text } from "ink";

export function ErrorMessages(props: { errors: Map<string, LogEntry<any>[]> }) {
  const { errors } = props;

  return (
    <Box flexDirection="column">
      <Text color="redBright">Errors</Text>
      <Box flexDirection="column" marginLeft={2} marginY={1}>
        {[...errors.entries()].map(([targetId, logs]) => (
          <Box flexDirection="column" key={`errorlogs-${targetId}`} marginBottom={1}>
            <Text color="cyanBright" underline bold>
              {targetId}
            </Text>
            <Text>{logs.map((entry) => entry.msg).join("\n")}</Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
