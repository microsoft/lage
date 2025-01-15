export function filterArgsForTasks(args: string[]): {
    tasks: string[];
    taskArgs: string[];
} {
  const optionsPosition = args.findIndex((arg) => arg.startsWith("-"));
  return {
    tasks: args.slice(0, optionsPosition === -1 ? undefined : optionsPosition),
    taskArgs: optionsPosition === -1 ? [] : args.slice(optionsPosition),
  };
}
