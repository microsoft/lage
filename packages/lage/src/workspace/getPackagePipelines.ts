import { PipelineDefinition } from "../types/PipelineDefinition";
import { PackageInfos, PackageInfo } from "workspace-tools";
import { cosmiconfigSync } from "cosmiconfig";
import path from "path";

const ConfigModuleName = "lage";

function getPipeline(info: PackageInfo) {
  const results = cosmiconfigSync(ConfigModuleName).search(
    path.dirname(info.packageJsonPath)
  );

  if (results && results.config) {
    return results.config.pipeline;
  }

  return null;
}

export function getPackagePipelines(
  allPackages: PackageInfos,
  defaultPipeline: PipelineDefinition
) {
  const packagePipelines = new Map<string, PipelineDefinition>();

  for (const pkg of Object.keys(allPackages)) {
    const pipeline = getPipeline(allPackages[pkg]);
    if (pipeline) {
      packagePipelines.set(pkg, pipeline);
    } else {
      packagePipelines.set(pkg, defaultPipeline);
    }
  }

  return packagePipelines;
}
