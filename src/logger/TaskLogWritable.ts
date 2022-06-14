import { Writable } from "stream";
import { TaskLogger } from "./TaskLogger";

export class TaskLogWritable extends Writable {
  private buffer: string = "";

  constructor(private taskLogger: TaskLogger) {
    super();
  }

  _write(
    chunk: Buffer,
    _encoding: string,
    callback: (error?: Error | null) => void
  ) {
    let prev = 0;
    let curr = 0;
    while (curr < chunk.byteLength) {
      if (chunk[curr] === 13 || (chunk[curr] === 10 && curr - prev > 1)) {
        this.buffer += chunk
          .slice(prev, curr)
          .toString()
          .replace(/^(\r\n|\n|\r)|(\r\n|\n|\r)$/g, "");
        this.flushLine();
        prev = curr;
      }
      curr++;
    }
    this.buffer += chunk
      .slice(prev, curr)
      .toString()
      .replace(/^(\r\n|\n|\r)|(\r\n|\n|\r)$/g, "");
    callback();
  }

  _final(callback: (error?: Error | null) => void) {
    if (this.buffer.length) {
      this.flushLine();
    }
    callback();
  }

  private flushLine() {
    this.taskLogger.verbose(this.buffer.trimRight());
    this.buffer = "";
  }
}
