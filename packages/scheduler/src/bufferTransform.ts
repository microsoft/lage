import { Transform } from "stream";

export function bufferTransform() {
  const chunks: string[] = [];

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
