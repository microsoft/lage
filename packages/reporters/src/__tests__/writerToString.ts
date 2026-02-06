import type streams from "memory-streams";

/**
 * Convert a stream to a string and remove trailing whitespace from lines (does not remove empty lines).
 * This ensures the output is stable between snapshots and file editing.
 */
export function writerToString(writer: streams.WritableStream): string {
  writer.end();
  return writer
    .toString()
    .split(/\r?\n/g)
    .map((line) => line.trimEnd())
    .join("\n");
}
