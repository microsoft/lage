import path from "path";
import fs from "fs";
import os from "os";

function findUp(name: string, dir: string) {
  let currentDir = dir;
  while (currentDir !== "/") {
    const fullPath = path.join(currentDir, name);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
    currentDir = path.dirname(currentDir);
  }
  return undefined;
}

export function getBinPaths() {
  const bins = os.platform() === "win32" ? ["lage.cmd", "lage-server.cmd"] : ["lage", "lage-server"];
  const binPaths = bins.map((bin) => findUp("node_modules/.bin/" + bin, __dirname));

  if (binPaths.some((binPath) => binPath === undefined)) {
    throw new Error("Could not find bin paths for lage or lage-server");
  }

  return { lage: binPaths[0]!, "lage-server": binPaths[1]! };
}

export function getBinScripts() {
  const thisPackageJsonPath = findUp("package.json", __dirname);

  if (!thisPackageJsonPath) {
    throw new Error("Could not find package.json of this packageF");
  }

  const thisPackagePath = path.dirname(thisPackageJsonPath);

  if (fs.existsSync(path.join(thisPackagePath, "dist", "lage.js"))) {
    // the case for CLI package after build
    return {
      lage: path.join(thisPackagePath, "dist", "lage.js"),
      "lage-server": path.join(thisPackagePath, "dist", "lage-server.js"),
    };
  } else {
    // the case for CLI package during development
    return {      
      lage: path.join(thisPackagePath, "bin", "lage.js"),
      "lage-server": path.join(thisPackagePath, "bin", "lage-server.js"),
    }
  }
}