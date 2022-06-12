import fs from "fs";
import path from "path";
import { logger } from "../logger";

export function version() {
  const lagePackageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "../../package.json"), "utf-8")
  );
  logger.info(lagePackageJson.version);
}
