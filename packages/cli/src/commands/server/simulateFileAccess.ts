import type { Logger } from "@lage-run/logger";
import path from "path";
import fs from "fs";
import { getWorkspaceRoot } from "workspace-tools";

export async function simulateFileAccess(logger: Logger, inputs: string[], outputs: string[]) {
  const root = getWorkspaceRoot(process.cwd())!;
  logger.silly("Now probing and touching inputs and outputs");

  // probe input files
  let fd: number;
  for (const input of inputs) {
    fd = fs.openSync(path.join(root, input), "r");
    fs.closeSync(fd);
  }

  // touch output files
  const time = new Date();
  for (const output of outputs) {
    try {
      fs.utimesSync(path.join(root, output), time, time);
    } catch (e) {
      // ignore
    }
  }
}
