import { type PipelineDefinition } from "@lage-run/config";
import { type TargetConfig } from "@lage-run/target-graph";

export function expandTargetDefinition(
  packageName: string | undefined,
  task: string,
  pipeline: PipelineDefinition,
  outputs: string[]
): TargetConfig {
  const id = packageName ? `${packageName}#${task}` : task;
  const emptyDefinition = {
    cache: false,
    dependsOn: [],
    options: {},
    outputs,
  };
  const definition =
    id in pipeline
      ? pipeline[id]
      : `#${task}` in pipeline
      ? pipeline[`#${task}`]
      : `//${task}` in pipeline
      ? pipeline[`//${task}`]
      : task in pipeline
      ? pipeline[task]
      : emptyDefinition;

  if (Array.isArray(definition)) {
    return emptyDefinition;
  } else {
    return definition;
  }
}
