import * as React from "react";
import { Box, Text } from "ink";

export function ThreadItem(props: { threadId: string | number; targetId: string }) {
  const { targetId, threadId } = props;
  return (
    <Box>
      <Box width="2">
        <Text>{threadId}</Text>
      </Box>
      {targetId ? <Text color="whiteBright">{targetId} </Text> : <Text color="gray">IDLE</Text>}
    </Box>
  );
}
