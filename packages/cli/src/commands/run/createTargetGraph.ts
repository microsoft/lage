import type { Logger } from "@lage-run/logger";
import { type TargetGraph, WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
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
  enableTargetConfigMerging: boolean;
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

export async function createTargetGraph(options: CreateTargetGraphOptions): Promise<TargetGraph> {
  const {
    logger,
    root,
    dependencies,
    dependents,
    enableTargetConfigMerging,
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

  const builder = new WorkspaceTargetGraphBuilder(root, packageInfos, enableTargetConfigMerging);

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

  const pipelineEntries = Object.entries(pipeline);

  // Add lage pipeline configuration in the package.json files.
  // They are configured in the lage field, but without the package id.
  // i.e. having this package.json
  //    { "name": "@lage-run/globby", "lage": { "transpile": { type: "npmScript" } }}
  // is equivalent to having the following in lage.config.js
  // { pipeline: { "@lage-run/globby#transpile": { type: "npmScript" } }
  // We conciously add these 'after' the ones in lage.config.js
  // to indicate that the more specific package.json definition takes
  //  precedence over the global lage.config.js.
  for (const [packageId, packageInfo] of Object.entries(packageInfos)) {
    const packageLageDefinition = packageInfo.lage as PipelineDefinition;
    if (packageLageDefinition) {
      for (const [id, definition] of Object.entries(packageLageDefinition)) {
        pipelineEntries.push([packageId + "#" + id, definition]);
      }
    }
  }

  for (const [id, definition] of pipelineEntries) {
    if (Array.isArray(definition)) {
      await builder.addTargetConfig(
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
      await builder.addTargetConfig(id, definition, changedFiles);
    }
  }

  return await builder.build(tasks, packages, priorities);
}
