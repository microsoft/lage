import type { ParsedLock, WorkspaceInfo } from "workspace-tools";
import { queryLockFile, listOfWorkspacePackageNames } from "workspace-tools";
import { nameAtVersion } from "./nameAtVersion.js";

export type Dependencies = { [key in string]: string };

export type ExternalDependenciesQueue = {
  name: string;
  versionRange: string;
}[];

export function filterExternalDependencies(dependencies: Dependencies, workspaces: WorkspaceInfo): Dependencies {
  const workspacePackageNames = listOfWorkspacePackageNames(workspaces);
  const externalDependencies: Dependencies = {};

  Object.entries(dependencies).forEach(([name, versionRange]) => {
    if (workspacePackageNames.indexOf(name) < 0) {
      externalDependencies[name] = versionRange;
    }
  });

  return externalDependencies;
}

function isDone(done: string[], key: string): boolean {
  return done.indexOf(key) >= 0;
}

function isInQueue(queue: [string, string][], key: string): boolean {
  return Boolean(queue.find(([name, versionRange]) => nameAtVersion(name, versionRange) === key));
}

export function addToQueue(dependencies: Dependencies | undefined, done: string[], queue: [string, string][]): void {
  if (dependencies) {
    Object.entries(dependencies).forEach(([name, versionRange]) => {
      const versionRangeSignature = nameAtVersion(name, versionRange);

      if (!isDone(done, versionRangeSignature) && !isInQueue(queue, versionRangeSignature)) {
        queue.push([name, versionRange]);
      }
    });
  }
}

export function resolveExternalDependencies(allDependencies: Dependencies, workspaces: WorkspaceInfo, lockInfo: ParsedLock): string[] {
  const externalDependencies = filterExternalDependencies(allDependencies, workspaces);

  const done: string[] = [];
  const doneRange: string[] = [];
  const queue = Object.entries(externalDependencies);

  while (queue.length > 0) {
    const next = queue.shift();

    if (!next) {
      continue;
    }

    const [name, versionRange] = next;
    doneRange.push(nameAtVersion(name, versionRange));

    const lockFileResult = queryLockFile(name, versionRange, lockInfo);

    if (lockFileResult) {
      const { version, dependencies } = lockFileResult;

      addToQueue(dependencies, doneRange, queue);
      done.push(nameAtVersion(name, version));
    } else {
      done.push(nameAtVersion(name, versionRange));
    }
  }

  return done;
}
