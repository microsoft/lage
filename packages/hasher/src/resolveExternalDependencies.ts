import { queryLockFile, type PackageInfos, type ParsedLock } from "workspace-tools";

type Dependencies = Record<string, string>;

export type DependencyQueue = [name: string, versionRange: string][];

export type DependencySpec = `${string}@${string}`;

/** Filter the `dependencies` object to only contain deps from outside the repo. */
export function _filterExternalDependencies(dependencies: Dependencies, packageInfos: PackageInfos): Dependencies {
  const externalDependencies: Dependencies = {};

  for (const [name, versionRange] of Object.entries(dependencies)) {
    if (!packageInfos[name]) {
      externalDependencies[name] = versionRange;
    }
  }

  return externalDependencies;
}

function isInQueue(queue: DependencyQueue, key: string): boolean {
  return queue.some(([name, versionRange]) => `${name}@${versionRange}` === key);
}

export function _addToQueue(dependencies: Dependencies | undefined, done: Set<DependencySpec>, queue: DependencyQueue): void {
  if (dependencies) {
    for (const [name, versionRange] of Object.entries(dependencies)) {
      const versionRangeSignature = `${name}@${versionRange}` as const;

      if (!done.has(versionRangeSignature) && !isInQueue(queue, versionRangeSignature)) {
        queue.push([name, versionRange]);
      }
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
  const externalDependencies = _filterExternalDependencies(allDependencies, packageInfos);

  const done = new Set<DependencySpec>();
  const doneRange = new Set<DependencySpec>();
  const queue: DependencyQueue = Object.entries(externalDependencies);

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next) {
      continue;
    }

    const [name, versionRange] = next;
    doneRange.add(`${name}@${versionRange}`);

    const lockFileResult = queryLockFile(name, versionRange, lockInfo);

    if (lockFileResult) {
      const { version, dependencies } = lockFileResult;

      _addToQueue(dependencies, doneRange, queue);
      done.add(`${name}@${version}`);
    } else {
      done.add(`${name}@${versionRange}`);
    }
  }

  return [...done];
}
