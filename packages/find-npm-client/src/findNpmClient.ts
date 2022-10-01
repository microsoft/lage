import path from "path";
import fs from "fs";

export function findNpmClient(npmClient: string) {
  const found = findInPath(npmClient);

  if (!found) {
    throw new Error(`npm client not found: ${npmClient}`);
  }

  return found;
}

function findInPath(target: string) {
  const pathEnv = Object.keys(process.env).find((key) => key.toLowerCase() === "path") ?? "PATH";
  const pathExtEnv = Object.keys(process.env).find((key) => key.toLowerCase() === "pathext") ?? "PATHEXT";

  const envPath = process.env[pathEnv] ?? "";
  const pathExt = process.env[pathExtEnv] ?? "";

  for (const search of envPath.split(path.delimiter)) {
    const found = pathExt
      .split(path.delimiter)
      .map((ext) => path.join(search, `${target}${ext}`))
      .find((p) => fs.existsSync(p));

    if (found) {
      return found;
    }
  }
}
