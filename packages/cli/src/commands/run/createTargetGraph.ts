import type { Logger } from "@lage-run/logger";
import { WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
import type { PackageInfos } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import type { PipelineDefinition } from "@lage-run/config";

interface CreateTargetGraphOptions {
  logger: Logger;
  root: string;
  dependencies: boolean;
  dependents: boolean;
  since?: string;
  scope?: string[];
  ignore: string[];
  repoWideChanges: string[];
  pipeline: PipelineDefinition;
  outputs: string[];
  tasks: string[];
  packageInfos: PackageInfos;
}

export function createTargetGraph(options: CreateTargetGraphOptions) {
  const { logger, root, dependencies, dependents, since, scope, repoWideChanges, ignore, pipeline, outputs, tasks, packageInfos } = options;

  const builder = new WorkspaceTargetGraphBuilder(root, packageInfos);

  const packages = getFilteredPackages({
    root,
    logger,
    packageInfos,
    includeDependencies: dependencies,
    includeDependents: dependents,
    since,
    scope,
    repoWideChanges,
    sinceIgnoreGlobs: ignore,
  });

  for (const [id, definition] of Object.entries(pipeline)) {
    if (Array.isArray(definition)) {
      builder.addTargetConfig(id, {
        cache: true,
        dependsOn: definition,
        options: {},
        outputs,
      });
    } else {
      builder.addTargetConfig(id, definition);
    }
  }

  return builder.build(tasks, packages);
}
