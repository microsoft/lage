import * as React from "react";
import { Box, Text } from "ink";

export function ThreadItem(props: { targetId: string }) {
  const { targetId } = props;
  return <Box>{targetId ? <Text color="whiteBright">[ {targetId} ]</Text> : <Text color="gray">[ IDLE ]</Text>}</Box>;
}
