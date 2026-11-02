import {
  queryLockFile,
  type PackageInfos,
  type ParsedLock,
} from "workspace-tools";

export type Dependencies = Record<string, string>;

export type DependencyQueue = [name: string, versionRange: string][];

export type DependencySpec = `${string}@${string}`;

/** Filter the `dependencies` object to only contain deps from outside the repo. */
function _filterExternalDependencies(
  dependencies: Dependencies,
  packageInfos: PackageInfos
): Dependencies {
  const externalDependencies: Dependencies = {};

  for (const [name, versionRange] of Object.entries(dependencies)) {
    if (!packageInfos[name]) {
      externalDependencies[name] = versionRange;
    }
  }

  return externalDependencies;
}

export function _addToQueue(
  dependencies: Dependencies | undefined,
  done: Set<DependencySpec>,
  queue: DependencyQueue,
  queued = new Set<DependencySpec>(
    queue.map(([name, versionRange]) => `${name}@${versionRange}` as const)
  )
): void {
  if (!dependencies) return;

  for (const [name, versionRange] of Object.entries(dependencies)) {
    const versionRangeSignature = `${name}@${versionRange}` as const;

    if (
      !done.has(versionRangeSignature) &&
      !queued.has(versionRangeSignature)
    ) {
      queued.add(versionRangeSignature);
      queue.push([name, versionRange]);
    }
  }
}

/**
 * Resolve versions for external (outside repo) dependencies and their transitive dependencies
 * using the lock file.
 * @returns Array of strings in the format `name@version`
 */
export function resolveExternalDependencies(
  allDependencies: Dependencies,
  packageInfos: PackageInfos,
  lockInfo: ParsedLock
): DependencySpec[] {
  const externalDependencies = _filterExternalDependencies(
    allDependencies,
    packageInfos
  );

  const done = new Set<DependencySpec>();
  const doneRange = new Set<DependencySpec>();
  const queue: DependencyQueue = Object.entries(externalDependencies);
  const queued = new Set<DependencySpec>(
    queue.map(([name, versionRange]) => `${name}@${versionRange}` as const)
  );

  for (const [name, versionRange] of queue) {
    doneRange.add(`${name}@${versionRange}`);

    const lockFileResult = queryLockFile(name, versionRange, lockInfo);

    if (lockFileResult) {
      const { version, dependencies } = lockFileResult;

      _addToQueue(dependencies, doneRange, queue, queued);
      done.add(`${name}@${version}`);
    } else {
      done.add(`${name}@${versionRange}`);
    }
  }

  return [...done];
}
