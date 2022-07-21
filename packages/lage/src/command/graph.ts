import { Config } from "../types/Config";
import { getWorkspaceRoot, getPackageInfos, createPackageGraph } from "workspace-tools";
import { getConfig } from "../config/getConfig";

export async function graph(cwd: string, config: Config) {
  const fs = require("fs");
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }
  const allPackages = getPackageInfos(root);
  const pattern = getConfig(cwd).scope;
  const edges = createPackageGraph(allPackages, {
    namePatterns: pattern,
    includeDependencies: config.includeDependencies,
    includeDependents: config.includeDependents,
    withDevDependencies: config.withDevDependencies,
    withPeerDependencies: config.withPeerDependencies,
  });
  fs.writeFileSync("graph-output.js", JSON.stringify(edges));
}
