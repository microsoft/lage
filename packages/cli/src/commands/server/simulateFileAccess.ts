import { getCacheDirectory } from "@lage-run/cache";
import type { Logger } from "@lage-run/logger";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { getWorkspaceRoot } from "workspace-tools";
import { traverse, type Target, type TargetGraph } from "@lage-run/target-graph";

export async function simulateFileAccess(logger: Logger, graph: TargetGraph, id: string, hash: string) {
  const root = getWorkspaceRoot(process.cwd())!;
  const hashManifestDirectory = path.join(root, "node_modules/.cache/lage/hashes");
  logger.info("Now probing and touching inputs and outputs");

  const outputLocalCacheDirectory = getCacheDirectory(root, hash);
  const outputs = await fg("**/*", { cwd: outputLocalCacheDirectory, onlyFiles: true });

  // probe inputs
  logger.silly("Probing inputs:\n" + inputs.join("\n"));

  let fd: number;
  for (const input of inputs) {
    fd = fs.openSync(input, "r");
    fs.closeSync(fd);
  }

  // touch outputs
  const time = new Date();
  logger.silly("Touching outputs:\n" + outputs.join("\n"));
  for (const output of outputs) {
    try {
      fs.utimesSync(output, time, time);
    } catch (err) {
      fs.closeSync(fs.openSync(output, "w"));
    }
  }
}

function collect(hashManifestDirectory: string, graph: TargetGraph, target: Target) {
  traverse(graph, target, (t) => {
    const hashManifestFile = path.join(hashManifestDirectory, `${t.id}.json`);

    const hashManifest = JSON.parse(fs.readFileSync(hashManifestFile, "utf-8")) as {
      fileHashes: Record<string, string>;
      globalFileHashes: Record<string, string>;
    };
    const inputs = Object.values(hashManifest.fileHashes).concat(Object.values(hashManifest.globalFileHashes));
  });
}

function readHashManifest(hashManifestDirectory: string, id: string) {
  const hashManifestFile = path.join(hashManifestDirectory, `${id}.json`);
  return JSON.parse(fs.readFileSync(hashManifestFile, "utf-8")) as {
    fileHashes: Record<string, string>;
    globalFileHashes: Record<string, string>;
  };
}
