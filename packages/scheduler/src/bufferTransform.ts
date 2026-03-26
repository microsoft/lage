import { Transform } from "stream";

export function bufferTransform(): {
  readonly buffer: string;
  transform: Transform;
  destroy: () => void;
} {
  const chunks: string[] = [];

  const transform = new Transform({
    transform(chunk, encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });

  return {
    get buffer() {
      return chunks.join("");
    },
    transform,
    destroy() {
      chunks.length = 0;
      transform.destroy();
    },
  };
}
