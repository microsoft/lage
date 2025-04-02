import { Writable } from "stream";

export class MemoryStream extends Writable {
  private chunks: Buffer[];

  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk: any, encoding: BufferEncoding) {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, encoding));
  }

  getData(): Buffer {
    return Buffer.concat(this.chunks);
  }

  toString(): string {
    return this.getData().toString();
  }
}
