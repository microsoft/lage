import { WorkspaceInfo, listOfWorkspacePackageNames } from "workspace-tools";

export type Dependencies = { [key in string]: string };

export function filterInternalDependencies(dependencies: Dependencies, workspaces: WorkspaceInfo): string[] {
  const workspacePackageNames = listOfWorkspacePackageNames(workspaces);
  return Object.keys(dependencies).filter((dependency) => workspacePackageNames.indexOf(dependency) >= 0);
}

export function resolveInternalDependencies(allDependencies: Dependencies, workspaces: WorkspaceInfo): string[] {
  const dependencyNames = filterInternalDependencies(allDependencies, workspaces);

  return dependencyNames;
}
