import path from "path";
import type { WorkspaceInfo } from "workspace-tools";

export function createPackageHashes(root: string, workspaceInfo: WorkspaceInfo, repoHashes: { [key: string]: string }) {
  /**
   * This is a trie that looks like this:
   * {
   *  "packages": {
   *    "experiences": {
   *       "react-web-client": {}
   *     }
   *   }
   * }
   */
  interface PathNode {
    [key: string]: PathNode;
  }

  const pathTree: PathNode = {};

  // Generate path tree of all packages in workspace (scale: ~2000 * ~3)
  for (const workspace of workspaceInfo) {
    const pathParts = path.relative(root, workspace.path).split(/[\\/]/);

    let currentNode = pathTree;

    for (const part of pathParts) {
      currentNode[part] = currentNode[part] || {};
      currentNode = currentNode[part];
    }
  }

  // key: path/to/package (packageRoot), value: array of a tuple of [file, hash]
  const packageHashes: Record<string, [string, string][]> = {};

  for (const [entry, value] of Object.entries(repoHashes)) {
    const pathParts = entry.split(/[\\/]/);

    let node = pathTree;
    const packagePathParts: string[] = [];

    for (const part of pathParts) {
      if (node[part]) {
        node = node[part] as PathNode;
        packagePathParts.push(part);
      } else {
        break;
      }
    }

    const packageRoot = packagePathParts.join("/");
    packageHashes[packageRoot] = packageHashes[packageRoot] || [];
    packageHashes[packageRoot].push([entry, value]);
  }

  return packageHashes;
}
