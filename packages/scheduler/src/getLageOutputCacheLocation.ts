import { getLogsCacheDirectory } from "@lage-run/cache";
import path from "path";

export function getLageOutputCacheLocation(root: string, hash: string) {
  const outputPath = getLogsCacheDirectory(root, hash);
  return path.join(outputPath, hash + ".log");
}
