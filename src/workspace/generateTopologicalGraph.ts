import { TopologicalGraph } from "../types/TopologicalGraph";
import { getDependentMap } from "workspace-tools";
import { Workspace } from "../types/Workspace";
import path from "path";

export function generateTopologicGraph(workspace: Workspace) {
  const graph: TopologicalGraph = {};

  const dependentMap = getDependentMap(workspace.allPackages);

  for (const [pkg, info] of Object.entries(workspace.allPackages)) {
    const deps = dependentMap.get(pkg);

    graph[pkg] = {
      dependencies: [...(deps ? deps : [])],
      location: path.relative(
        workspace.root,
        path.dirname(info.packageJsonPath)
      ),
    };
  }

  return graph;
}
