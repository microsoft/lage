import { Writable } from "stream";
import { Logger, LogLevel } from "@lage-run/Logger";

export class LogWritable extends Writable {
  private buffer: string = "";

  constructor(private logLevel: LogLevel, private logger: Logger) {
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
        this.buffer =
          this.buffer +
          chunk
            .slice(prev, curr)
            .toString()
            .replace(/^(\r\n|\n|\r)|(\r\n|\n|\r)$/g, "")
            .trimRight();
        this.logger.log(this.logLevel, this.buffer);
        this.buffer = "";
        prev = curr;
      }
      curr++;
    }
    callback();
  }
}
