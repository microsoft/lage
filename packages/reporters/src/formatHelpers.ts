import { gradient } from "@ms-cloudpack/task-reporter";
import ansiRegex from "ansi-regex";

/** 80-character divider line */
export const hrLine = "┈".repeat(80);

const stripAnsiRegex = ansiRegex();

/** Strip ANSI escape codes from a string */
export function stripAnsi(message: string): string {
  return message.replace(stripAnsiRegex, "");
}

const orangeTuple = [237, 178, 77] as const;
const cyanTuple = [0, 255, 255] as const;

/** Return the string with an orange to cyan gradient */
export function fancyGradient(str: string): string {
  return gradient(str, orangeTuple, cyanTuple);
}

/** Format a number of bytes as MB */
export function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * Format the memory usage if enabled: e.g. ` [rss: 50.00 MB, heap: 30.00 MB]`.
 * Returns an empty string if not enabled.
 */
export function formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage | undefined, logMemory: boolean | undefined): string {
  if (!memoryUsage || !logMemory) {
    return "";
  }
  return ` [rss: ${formatBytes(memoryUsage.rss)}, heap: ${formatBytes(memoryUsage.heapUsed)}]`;
}
