import { Target } from "@lage-run/target-graph";
import { Transform } from "node:stream";
import fs from "node:fs";
import path from "node:path";

export function getLageOutputCacheLocation(target: Target, hash: string) {
  const outputPath = path.join(target.cwd, "node_modules/.cache/lage/output/");
  return path.join(outputPath, hash + ".txt");
}

export function createCachedOutputTransform(target: Target, hash: string) {
  const outputFile = getLageOutputCacheLocation(target, hash);
  const outputPath = path.dirname(outputFile);

  if (!fs.existsSync(outputFile)) {
    fs.mkdirSync(outputPath, { recursive: true });
    const writeStream = fs.createWriteStream(path.join(outputPath, hash + ".txt"));

    const transform = new Transform({
      transform(chunk, encoding, callback) {
        writeStream.write(chunk);
        callback(null, chunk);
      },
    });

    return transform;
  }

  return new Transform({
    transform(chunk, encoding, callback) {
      callback(null, chunk);
    },
  });
}
