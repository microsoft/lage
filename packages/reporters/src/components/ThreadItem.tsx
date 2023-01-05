import * as React from "react";
import { Text } from "ink";

export function ThreadItem(props: { targetId: string }) {
  const { targetId } = props;
  return targetId ? <Text color="whiteBright">{targetId} </Text> : <Text color="gray">IDLE</Text>;
}
