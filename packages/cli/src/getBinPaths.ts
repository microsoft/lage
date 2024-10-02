import path from "path";
import fs from "fs";

export function getBinPaths() {
  let dir = __dirname;
  let packageJsonPath = "";
  while (dir !== "/") {
    packageJsonPath = path.join(dir, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      break;
    }
    dir = path.dirname(dir);
  }
  const packageJson = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
  return { lage: path.join(dir, packageJson.bin.lage), "lage-server": path.join(dir, packageJson.bin["lage-server"]) };
}
