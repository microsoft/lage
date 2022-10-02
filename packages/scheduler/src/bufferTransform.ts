import { Transform } from "stream";

export function bufferTransform() {
  let chunks: string[] = [];

  return {
    get buffer() {
      return chunks.join("");
    },
    transform: new Transform({
      transform(chunk, encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      },
    }),
  };
}
