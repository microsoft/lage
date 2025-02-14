import type { Logger } from "@lage-run/logger";
import { WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
import type { PackageInfos } from "workspace-tools";
import { getBranchChanges, getDefaultRemoteBranch, getStagedChanges, getUnstagedChanges, getUntrackedChanges } from "workspace-tools";
import { getFilteredPackages } from "../../filter/getFilteredPackages.js";
import type { PipelineDefinition, Priority } from "@lage-run/config";
import { hasRepoChanged } from "../../filter/hasRepoChanged.js";

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
  priorities: Priority[];
}

function getChangedFiles(since: string, cwd: string) {
  const targetBranch = since || getDefaultRemoteBranch({ cwd });

  const changes = [
    ...new Set([
      ...(getUntrackedChanges(cwd) || []),
      ...(getUnstagedChanges(cwd) || []),
      ...(getBranchChanges(targetBranch, cwd) || []),
      ...(getStagedChanges(cwd) || []),
    ]),
  ];

  return changes;
}

export async function createTargetGraph(options: CreateTargetGraphOptions) {
  const {
    logger,
    root,
    dependencies,
    dependents,
    since,
    scope,
    repoWideChanges,
    ignore,
    pipeline,
    outputs,
    tasks,
    packageInfos,
    priorities,
  } = options;

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

  let changedFiles: string[] = [];

  // TODO: enhancement would be for workspace-tools to implement a "getChangedPackageFromChangedFiles()" type function
  // TODO: optimize this so that we don't double up the work to determine if repo has changed
  if (since) {
    if (!hasRepoChanged(since, root, repoWideChanges, logger)) {
      changedFiles = getChangedFiles(since, root);
    }
  }

  for (const [id, definition] of Object.entries(pipeline)) {
    if (Array.isArray(definition)) {
      builder.addTargetConfig(
        id,
        {
          cache: true,
          dependsOn: definition,
          options: {},
          outputs,
        },
        changedFiles
      );
    } else {
      builder.addTargetConfig(id, definition, changedFiles);
    }
  }

  return await builder.build(tasks, packages, priorities);
}
