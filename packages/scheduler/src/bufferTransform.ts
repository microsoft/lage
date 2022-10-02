import { Transform } from "stream";

export function bufferTransform() {
  let buffer = "";

  return {
    buffer,
    transform: new Transform({
      transform(chunk, encoding, callback) {
        buffer += chunk.toString();
        callback();
      },
    }),
  };
}
