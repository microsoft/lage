import { getCacheDirectory } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { getWorkspaceRoot } from "workspace-tools";

export async function simulateFileAccess(logger: Logger, response: { id: string; hash: string }) {
  const root = getWorkspaceRoot(process.cwd())!;
  const hashManifestDirectory = path.join(root, "node_modules/.cache/lage/hashes");
  logger.info("Now probing and touching inputs and outputs");
  const hashManifestFile = path.join(hashManifestDirectory, `${response.id}.json`);
  const hashManifest = JSON.parse(hashManifestFile) as { fileHashes: Record<string, string>; globalFileHashes: Record<string, string> };
  const inputs = Object.values(hashManifest.fileHashes).concat(Object.values(hashManifest.globalFileHashes));

  const outputLocalCacheDirectory = getCacheDirectory(root, response.hash);
  const outputs = await fg("**/*", { cwd: outputLocalCacheDirectory, onlyFiles: true });

  // probe inputs
  let fd: number;
  for (const input of inputs) {
    fd = fs.openSync(input, "r");
    fs.closeSync(fd);
  }

  // touch outputs
  const time = new Date();

  for (const output of outputs) {
    try {
      fs.utimesSync(output, time, time);
    } catch (err) {
      fs.closeSync(fs.openSync(output, "w"));
    }
  }
}
