import type { Logger } from "@lage-run/logger";
import path from "path";
import fs from "fs";

export async function simulateFileAccess(logger: Logger, root: string, inputs: string[], outputs: string[]) {
  logger.silly("Now probing and touching inputs and outputs");

  // Helper to get all directory parts up to root
  const getAllDirectoryParts = (filePath: string): string[] => {
    const parts: string[] = [];
    let dirPath = path.dirname(filePath);

    while (dirPath !== "." && dirPath !== "") {
      parts.push(dirPath);
      dirPath = path.dirname(dirPath);
    }

    return parts;
  };

  const inputDirectories = new Set<string>();

  // read input files
  let fd: number;
  let buffer: Buffer = Buffer.alloc(1);
  for (const input of inputs) {
    try {
      let inputPath = path.join(root, input);
      if (!fs.lstatSync(inputPath).isDirectory()) {
        fd = fs.openSync(inputPath, "r");
        // Simulate a file content read by reading 1 byte of the opened file handle
        fs.readSync(fd, buffer, 0, 1, 0);
        fs.closeSync(fd);
      }
      else {
        inputDirectories.add(inputPath);
      }
    } catch (e) {
      // ignore
    }

    // Add all directory parts to the set
    getAllDirectoryParts(input).forEach((dir) => inputDirectories.add(dir));
  }

  for (const directory of inputDirectories) {
    try {
      // Simulate enumerating a directory
      fs.readdirSync(path.join(root, directory));
    } catch (e) {
      // ignore
    }
  }

  // touch output files
  const time = new Date();
  const outputDirectories = new Set<string>();
  for (const output of outputs) {
    // Add all directory parts to the set
    getAllDirectoryParts(output).forEach((dir) => outputDirectories.add(dir));

    try {
      fs.utimesSync(path.join(root, output), time, time);
    } catch (e) {
      // ignore
    }
  }

  for (const directory of outputDirectories) {
    try {
      fs.utimesSync(path.join(root, directory), time, time);
    } catch (e) {
      // ignore
    }
  }
}
