import chokidar from "chokidar";

import path from "path";
import { getPackageInfos, getWorkspaceRoot } from "workspace-tools";
import type { PackageInfo, PackageInfos } from "workspace-tools";
import EventEmitter from "events";

interface PathIndexItem {
  packageName?: string;
}

interface PathIndex {
  [pathPart: string]: PathIndexItem;
}

export function watch(cwd: string): EventEmitter {
  const events = new EventEmitter();
  const root = getWorkspaceRoot(cwd);
  const packageInfos = getPackageInfos(cwd);

  // generate a tree index of all the packages
  const packageIndex = createPackageIndex(root!, packageInfos);

  const packagePaths = Object.values(packageInfos).map((pkg) => path.dirname(pkg.packageJsonPath));

  // watch for changes in the packages
  const watcher = chokidar.watch(packagePaths, {
    cwd: root,
    ignored: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/lib/**"],
  });

  // when a change happens, find the package that changed
  watcher.on("change", (filePath) => {
    console.log("changed, filePath", filePath);
    const packageName = findPackageByPath(filePath, packageIndex);
    events.emit("change", packageName);
  });

  return events;
}

function createPackageIndex(root: string, packageInfos: PackageInfos) {
  const pathIndex: PathIndex = {};

  // generate a tree index of all the packages
  for (const [packageName, info] of Object.entries(packageInfos)) {
    const packagePath = path.relative(root, path.dirname(info.packageJsonPath));
    const pathParts = packagePath.split(/[/\\]/);

    let pointer: PathIndexItem = pathIndex;

    for (const pathPart of pathParts) {
      if (!pointer[pathPart]) {
        pointer[pathPart] = {};
      }

      pointer = pointer[pathPart];
    }

    pointer.packageName = packageName;
  }

  return pathIndex;
}

function findPackageByPath(filePath: string, index: PathIndex) {
  const pathParts = filePath.split(/[/\\]/);

  let pointer: PathIndexItem = index;

  for (const pathPart of pathParts) {
    if (!pointer[pathPart]) {
      console.log(pathPart, filePath);
      break;
    }

    if (pointer[pathPart].packageName) {
      return pointer[pathPart].packageName;
    }

    pointer = pointer[pathPart];
  }

  return undefined;
}
