import type { Target } from "@lage-run/target-graph";
import type { PipelineDefinition } from "../../types/PipelineDefinition";

export function filterPipelineDefinitions(targets: IterableIterator<Target>, pipeline: PipelineDefinition) {
  const tasksSet = new Set<string>();

  for (const target of targets) {
    tasksSet.add(target.task);
  }
  const filteredPipeline: PipelineDefinition = {};
  for (const [id, definition] of Object.entries(pipeline ?? {})) {
    if (tasksSet.has(id)) {
      filteredPipeline[id] = definition;
    }
  }

  return filteredPipeline;
}
