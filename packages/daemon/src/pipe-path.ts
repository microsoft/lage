import os from "node:os";
import { createHash } from "node:crypto";
import path from "node:path";

const pipePaths: Record<string, string> = {};

export function getPipePath(root: string) {
  if (!pipePaths[root]) {
    const pipeBasePath = process.env.PIPE_PATH ?? os.platform() === "win32" ? "\\\\.\\pipe" : "/tmp";
    const hashedRoot = createHash("sha256").update(root.replace(/\\/g, "/").toLowerCase()).digest("hex");
    pipePaths[root] = path.join(pipeBasePath, `lage-daemon-${hashedRoot}`);
  }

  return pipePaths[root];
}
