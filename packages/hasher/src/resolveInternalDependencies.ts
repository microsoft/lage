import type { WorkspaceInfos } from "workspace-tools";

export type Dependencies = { [key in string]: string };

export function filterInternalDependencies(dependencies: Dependencies, workspaces: WorkspaceInfos): string[] {
  const workspacePackageNames = workspaces.map((ws) => ws.name);
  return Object.keys(dependencies).filter((dependency) => workspacePackageNames.indexOf(dependency) >= 0);
}

export function resolveInternalDependencies(allDependencies: Dependencies, workspaces: WorkspaceInfos): string[] {
  const dependencyNames = filterInternalDependencies(allDependencies, workspaces);

  return dependencyNames;
}
