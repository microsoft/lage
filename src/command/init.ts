import { logger } from "../logger";
import fs from "fs";
import path from "path";
import execa from "execa";

type WorkspaceManager = "rush" | "pnpm" | "yarn";

export async function init(cwd: string) {
  logger.info("initialize lage with a default configuration file");

  let workspaceManager: WorkspaceManager = "yarn";

  try {
    workspaceManager = whichWorkspaceManager(cwd);
  } catch (e) {
    logger.error(
      "lage requires you to be using a workspace - make sure you are using yarn workspaces, pnpm workspaces, or rush"
    );
  }

  const pipeline = {
    build: ["^build"],
    test: ["build"],
    lint: [],
  };

  const lageConfig = {
    pipeline,
    npmClient: workspaceManager === "yarn" ? "yarn" : "npm",
  };

  const lageConfigFile = path.join(cwd, "lage.config.js");
  if (!fs.existsSync(lageConfigFile)) {
    fs.writeFileSync(
      lageConfigFile,
      "module.exports = " + JSON.stringify(lageConfig, null, 2) + ";"
    );
  }

  installLage(cwd, workspaceManager);

  logger.info(
    `Lage is initialized! You can now run: ${renderBuildCommand(
      workspaceManager
    )}`
  );
}

function renderBuildCommand(workspaceManager: WorkspaceManager) {
  switch (workspaceManager) {
    case "yarn":
      return `yarn lage build`;

    case `pnpm`:
      return `pnpm run lage build`;

    case `rush`:
      return `npm run lage build`;
  }
}

function whichWorkspaceManager(cwd: string) {
  if (fs.existsSync(path.join(cwd, "rush.json"))) {
    return "rush";
  }

  if (fs.existsSync(path.join(cwd, "yarn.lock"))) {
    return "yarn";
  }

  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return "pnpm";
  }

  throw new Error("not a workspace");
}

async function installLage(cwd: string, workspaceManager: WorkspaceManager) {
  const packageJson = readPackageJson(cwd);
  const lageVersion = getLageVersion();

  switch (workspaceManager) {
    case "yarn":
      packageJson.scripts = packageJson.scripts || {};
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.scripts.lage = "lage";
      packageJson.devDependencies.lage = lageVersion;
      writePackageJson(cwd, packageJson);
      await execa("yarn", {
        stdio: "inherit",
      });
      break;

    case "pnpm":
      packageJson.scripts = packageJson.scripts || {};
      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.scripts.lage = "lage";
      packageJson.devDependencies.lage = lageVersion;
      writePackageJson(cwd, packageJson);
      await execa("pnpm", ["install"], { stdio: "inherit" });
      break;

    case "rush":
      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.lage = `node common/scripts/install-run.js lage@${lageVersion} lage`;
      writePackageJson(cwd, packageJson);
      break;
  }
}

function getLageVersion() {
  const lagePackageJsonFile = require.resolve("../../package.json", {
    paths: [__dirname],
  });
  const lagePackageJson = JSON.parse(
    fs.readFileSync(lagePackageJsonFile, "utf-8")
  );
  return lagePackageJson.version;
}

function writePackageJson(cwd: string, packageJson: any) {
  const packageJsonFile = path.join(cwd, "package.json");
  fs.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2));
}

function readPackageJson(cwd: string) {
  const packageJsonFile = path.join(cwd, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonFile, "utf-8"));
}
