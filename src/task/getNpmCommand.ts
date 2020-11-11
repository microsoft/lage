export function getNpmCommand(
  nodeArgs: string[],
  passThroughArgs: string[],
  task: string
) {
  const extraArgs =
    passThroughArgs.length > 0 ? ["--", ...passThroughArgs] : [];
  return [...nodeArgs, "run", task, ...extraArgs];
}
