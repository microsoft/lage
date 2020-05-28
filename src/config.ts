import { PackageInfos, PackageInfo } from "workspace-tools";
import path from "path";
import { cosmiconfigSync } from "cosmiconfig";
import { Pipeline } from "./types/RunContext";

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

export function getPackagePipelines(allPackages: PackageInfos) {
  const packagePipelines = new Map<string, Pipeline>();

  for (const pkg of Object.keys(allPackages)) {
    const pipeline = getPipeline(allPackages[pkg]);
    if (pipeline) {
      packagePipelines.set(pkg, pipeline);
    }
  }

  return packagePipelines;
}
