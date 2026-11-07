import { type PackageInfo } from "../types/PackageInfo.js";

export interface PackageDependenciesOptions {
  withDevDependencies?: boolean;
  withPeerDependencies?: boolean;
  withOptionalDependencies?: boolean;
}

type DependencyType = "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies";

/**
 * Gets the monorepo package dependencies for a given package (excluding `file:` or `npm:` versions).
 * It only considers `dependencies` and `devDependencies` unless options specify otherwise.
 *
 * @param info - The package information containing dependencies
 * @param internalPackages - Set of in-repo package names to consider.
 * @param options - Configuration options for which dependency types to include
 * @returns Subset of `packages` that are dependencies of the given package
 */
export function getPackageDependencies(
  info: PackageInfo,
  internalPackages: Set<string>,
  options: PackageDependenciesOptions = { withDevDependencies: true }
): string[] {
  const depTypes: DependencyType[] = ["dependencies"];
  options.withDevDependencies && depTypes.push("devDependencies");
  options.withPeerDependencies && depTypes.push("peerDependencies");
  options.withOptionalDependencies && depTypes.push("optionalDependencies");

  const deps: string[] = [];

  for (const depType of depTypes) {
    const dependencies = info[depType];
    if (!dependencies) {
      continue;
    }

    for (const [dep, range] of Object.entries(dependencies)) {
      if (dep !== info.name && internalPackages.has(dep) && !range.startsWith("npm:") && !range.startsWith("file:")) {
        deps.push(dep);
      }
    }
  }

  return deps;
}
