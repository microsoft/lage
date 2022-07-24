import { Config } from "../types/Config";
import { getWorkspaceRoot, getPackageInfos, createPackageGraph } from "workspace-tools";
import { getConfig } from "../config/getConfig";
import { getWorkspace } from "../workspace/getWorkspace";
import { getPipelinePackages } from "../task/getPipelinePackages";
import { logger } from "../logger";

export async function graph(cwd: string, config: Config) {
  const fs = require("fs");
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }
  const workspace = getWorkspace(cwd, config);
  const packages = getPipelinePackages(workspace, config);
  const allPackages = getPackageInfos(root);
  const pattern = getConfig(cwd).scope;
  var edges;

  if (pattern.length != 0) {
    edges = createPackageGraph(allPackages, {
      namePatterns: pattern,
      includeDependencies: config.includeDependencies,
      includeDependents: config.includeDependents,
      withDevDependencies: config.withDevDependencies,
      withPeerDependencies: config.withPeerDependencies,
    });
  } else {
    edges = createPackageGraph(allPackages, {
      namePatterns: packages,
      includeDependencies: true,
      includeDependents: true,
      withDevDependencies: true,
      withPeerDependencies: true,
    });
  }

  logger.info("graph-output.js is created!");
  logger.info("Go to http://localhost:3000/lage/grapher to visualize package dependencies.");
  fs.writeFileSync("graph-output.js", JSON.stringify(edges));
}
