import { Writable } from "stream";
import { stripAnsi } from "../formatHelpers.js";

/** Stream that saves chunks to memory */
export class MemoryStream extends Writable {
  private chunks: string[] = [];

  public _write(chunk: Buffer | string, _encoding: string, callback: (error?: Error | null) => void): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk.toString("utf8") : chunk);
    callback();
  }

  /**
   * Convert the stream to a string and clean it up (options could be added to control this if needed):
   * - remove ANSI escapes
   * - remove trailing whitespace from lines (does not remove empty lines)
   * - convert all timestamps in square brackets to a fixed value
   * - convert all ms durations in parentheses to a fixed value
   *
   * This ensures the output is stable between snapshots and file editing.
   * It's not called `toString()` to avoid it being called accidentally.
   */
  public getOutput(): string {
    return stripAnsi(this.chunks.join(""))
      .split(/\r?\n/g)
      .map((line) => line.trimEnd())
      .join("\n")
      .replace(/\[\d{2}:\d{2}:\d{2}\] /g, "[12:34:56] ")
      .replace(/\(\d+ms\)/g, "(1ms)");
  }

  /** Clear the previously captured output */
  public clearOutput(): void {
    this.chunks = [];
  }
}
