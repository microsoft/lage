import { type TargetGraph, WorkspaceTargetGraphBuilder } from "@lage-run/target-graph";
import type { PackageInfos } from "workspace-tools";
import type { CacheOptions, ConfigOptions, PipelineDefinition } from "@lage-run/config";
import { getChangedFiles, type ChangedFiles } from "../../filter/getChangedFiles.js";
import { getFilteredPackages, type GetFilteredPackagesParams } from "../../filter/getFilteredPackages.js";

export interface CreateTargetGraphOptions {
  root: string;
  /**
   * Build the target graph for these packages.
   * This may be either a hardcoded list, or determined by `getFilteredPackages`.
   */
  packages: string[];
  /**
   * Precomputed changes used here only for staged-target optimization.
   * If omitted, staged targets are disabled and the supplied packages keep their normal targets.
   * (Package selection happens separately via `packages`.)
   */
  changes?: ChangedFiles;
  config: Pick<ConfigOptions, "pipeline" | "priorities" | "enableTargetConfigMerging" | "enablePhantomTargetOptimization"> & {
    cacheOptions: Pick<CacheOptions, "outputGlob">;
  };
  /** Requested tasks to run */
  tasks: string[];
  packageInfos: PackageInfos;
}

export type CreateFilteredTargetGraphOptions = Omit<CreateTargetGraphOptions, "packages" | "changes"> &
  Pick<GetFilteredPackagesParams, "logger" | "options"> & {
    config: CreateTargetGraphOptions["config"] & GetFilteredPackagesParams["config"];
  };

/** Select packages and build their target graph, only getting changes from git once. */
export async function createFilteredTargetGraph(
  params: CreateFilteredTargetGraphOptions
): Promise<{ packages: string[]; targetGraph: TargetGraph }> {
  const { root, packageInfos, logger, options, config, tasks } = params;

  // Change detection is only needed upfront if there are staged targets defined in the pipeline.
  const hasStagedTarget = [config.pipeline, ...Object.values(packageInfos).map((info) => info.lage as PipelineDefinition | undefined)].some(
    (pipeline) => pipeline && Object.values(pipeline).some((definition) => "stagedTarget" in definition)
  );

  const changes = hasStagedTarget
    ? getChangedFiles({ since: options.since, root, repoWideChanges: config.repoWideChanges, logger })
    : undefined;

  const packages = getFilteredPackages({ root, packageInfos, logger, options, config, changes });

  const targetGraph = await createTargetGraph({ root, packageInfos, config, tasks, packages, changes });

  return { packages, targetGraph };
}

export async function createTargetGraph(options: CreateTargetGraphOptions): Promise<TargetGraph> {
  const { root, packages, changes, config, tasks, packageInfos } = options;
  const { pipeline, cacheOptions, priorities, enableTargetConfigMerging, enablePhantomTargetOptimization } = config;

  const builder = new WorkspaceTargetGraphBuilder({ root, packageInfos, enableTargetConfigMerging, enablePhantomTargetOptimization });
  // Staged targets require successful change detection with no repo-wide changes.
  // Passing [] disables the optimization and keeps normal targets for the selected packages
  // if there are repo-wide changes (or it couldn't be determined, or isn't relevant).
  const changedFiles = changes?.status === "success" && !changes.repoWideChangedFiles.length ? changes.changedFiles : [];

  const pipelineEntries = Object.entries(pipeline);

  // Add lage pipeline configuration from the package.json files.
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
          outputs: cacheOptions.outputGlob,
        },
        changedFiles
      );
    } else {
      builder.addTargetConfig(id, definition, changedFiles);
    }
  }

  return await builder.build(tasks, packages, priorities);
}
