import { Writable } from "stream";

export class MemoryStream extends Writable {
  private chunks: Buffer[];

  constructor() {
    super();
    this.chunks = [];
  }

  _write(chunk: unknown, encoding: BufferEncoding): void {
    this.chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as any, encoding));
  }

  getData(): Buffer {
    return Buffer.concat(this.chunks);
  }

  toString(): string {
    return this.getData().toString();
  }
}
