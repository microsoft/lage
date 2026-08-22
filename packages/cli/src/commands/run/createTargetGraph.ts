import type { TargetLogger } from "@lage-run/reporters";
import { type Priority, type TargetGraph, WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
import type { PackageInfos } from "workspace-tools";
import { getChangedFilesSince, getFilteredPackages } from "../../filter/getFilteredPackages.js";
import type { PipelineDefinition } from "@lage-run/config";
import type { ExperimentalLockfileInvalidationOptions } from "@lage-run/lockfile";

interface CreateTargetGraphOptions {
  logger: TargetLogger;
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
  enablePhantomTargetOptimization: boolean;
  experimentalLockfileInvalidation?: ExperimentalLockfileInvalidationOptions;
  changedFiles?: string[];
  filteredPackages?: string[];
  repoWideChanged?: boolean;
}

export async function createTargetGraph(options: CreateTargetGraphOptions): Promise<TargetGraph> {
  const {
    logger,
    root,
    dependencies,
    dependents,
    enableTargetConfigMerging,
    enablePhantomTargetOptimization,
    since,
    scope,
    repoWideChanges,
    ignore,
    pipeline,
    outputs,
    tasks,
    packageInfos,
    priorities,
    experimentalLockfileInvalidation,
    changedFiles: providedChangedFiles,
    filteredPackages: providedFilteredPackages,
    repoWideChanged: providedRepoWideChanged,
  } = options;

  const builder = new WorkspaceTargetGraphBuilder({ root, packageInfos, enableTargetConfigMerging, enablePhantomTargetOptimization });

  let changedFiles = providedChangedFiles;
  if (since && changedFiles === undefined) {
    try {
      changedFiles = getChangedFilesSince(root, since);
    } catch (e) {
      logger.warn(`An error in the git command has caused this scope run to include every package\n${e}`);
    }
  }

  let repoWideChanged = providedRepoWideChanged ?? false;
  const packages =
    providedFilteredPackages ??
    getFilteredPackages({
      root,
      logger,
      packageInfos,
      includeDependencies: dependencies,
      includeDependents: dependents,
      since,
      scope,
      repoWideChanges,
      sinceIgnoreGlobs: ignore,
      experimentalLockfileInvalidation,
      changedFiles,
      onRepoWideChange: (detected) => {
        repoWideChanged = detected;
      },
    });
  const targetConfigChangedFiles = repoWideChanged ? [] : (changedFiles ?? []);

  const pipelineEntries = Object.entries(pipeline);

  // Add lage pipeline configuration in the package.json files.
  // They are configured in the lage field, but without the package id.
  // i.e. having this package.json
  //    { "name": "foo", "lage": { "transpile": { type: "npmScript" } }}
  // is equivalent to having the following in lage.config.js
  // { pipeline: { "foo#transpile": { type: "npmScript" } }
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
      builder.addTargetConfig(
        id,
        {
          cache: true,
          dependsOn: definition,
          options: {},
          outputs,
        },
        targetConfigChangedFiles
      );
    } else {
      builder.addTargetConfig(id, definition, targetConfigChangedFiles);
    }
  }

  return await builder.build(tasks, packages, priorities);
}
