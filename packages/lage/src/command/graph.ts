import { getWorkspaceRoot, getPackageInfos, createPackageGraph } from "workspace-tools";

export async function graph(cwd: string) {
  const root = getWorkspaceRoot(cwd);
  if (!root) {
    throw new Error("This must be called inside a codebase that is part of a JavaScript workspace.");
  }
  const allPackages = getPackageInfos(root);
  const edges = createPackageGraph(allPackages, {
    namePatterns: ["@nova/types"],
    includeDependencies: true,
    includeDependents: false,
  });
  const fs = require("fs");
  let output = JSON.stringify(edges);
  fs.writeFileSync("types-dependents-false.js", output);
}
