import { Config } from "../types/Config";
import { filterPackages } from "./filterPackages";
import { Workspace } from "../types/Workspace";
import { getScopedPackages, getChangedPackages } from "workspace-tools";
export function getPipelinePackages(workspace: Workspace, config: Config) {
  // Filter packages per --scope and command(s)
  const { scope, since } = config;

  // If scoped is defined, get scoped packages
  const hasScopes = Array.isArray(scope) && scope.length > 0;
  let scopedPackages: string[] | undefined = undefined;
  if (hasScopes) {
    scopedPackages = getScopedPackages(scope!, workspace.allPackages);
  }

  const hasSince = typeof since !== "undefined";
  let changedPackages: string[] | undefined = undefined;

  if (hasSince) {
    changedPackages = getChangedPackages(workspace.root, since, config.ignore);
  }

  return filterPackages({
    allPackages: workspace.allPackages,
    deps: config.deps,
    scopedPackages,
    changedPackages,
  });
}
