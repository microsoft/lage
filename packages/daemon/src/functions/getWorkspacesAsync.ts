import { type WorkspaceInfo, getWorkspacesAsync as original } from "workspace-tools";

const packageInfosByRoot: Map<string, WorkspaceInfo> = new Map();

export async function getWorkspacesAsync(root: string): Promise<WorkspaceInfo> {
  if (!packageInfosByRoot.has(root)) {
    packageInfosByRoot.set(root, await original(root));
  }

  return packageInfosByRoot.get(root)!;
}
