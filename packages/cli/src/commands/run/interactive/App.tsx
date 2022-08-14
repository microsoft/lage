import { LogEntry } from "@lage-run/logger";
import { Box, Text, useInput, useApp, Newline } from "ink";
import React from "react";
import useStdoutDimensions from "ink-use-stdout-dimensions";
import stripAnsi from "strip-ansi";
import { getPackageAndTask } from "@lage-run/target-graph";

interface AppProps {
  entries: LogEntry<any>[];
}

export const App: React.FC<AppProps> = ({ entries }) => {
  //const [selectedGroup, setSelectedGroup] = React.useState("lage#build");
  const selectedGroup = "lage#build";

  const { exit } = useApp();

  const [width, height] = useStdoutDimensions();

  useInput((input, key) => {
    if (input === "q") {
      exit();
    }
  });

  const targetEntries = new Map<string, LogEntry<any>[]>();
  
  for (const entry of entries) {
    const group = entry.data?.target?.id;

    if (!targetEntries.has(group)) {
      targetEntries.set(group, []);
    }

    targetEntries.get(group)!.push(entry);
  }

  const displayEntries = targetEntries.get(selectedGroup) ?? [];

  const { packageName, task } = getPackageAndTask(selectedGroup);

  return (
    <Box width={width} height={height} flexDirection="column">
      <Box flexDirection="row" justifyContent="center">
        <Text>Running</Text>
        <Text> | </Text>
        <Text>Finished</Text>
        <Text> | </Text>
        <Text>Run info</Text>
      </Box>
      <Newline />
      <Box flexDirection="column" borderStyle="single" height="100%">
        <Text>{packageName} {task}</Text>
        {displayEntries.slice(displayEntries.length - 15, displayEntries.length).map((entry, index) => (
          <Text key={entry.data?.target?.id + "_" + index}>{stripAnsi(entry.msg)}</Text>
        ))}
      </Box>
    </Box>
  );
};
