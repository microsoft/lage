/* eslint-disable no-console -- logger doesn't work in this context */
import { readConfigFile } from "@lage-run/config";
import fs from "fs";
import path from "path";
import execa from "execa";

type WorkspaceManager = "rush" | "pnpm" | "yarn" | "npm";

export async function initAction(): Promise<void> {
  const cwd = process.cwd();

  const config = await readConfigFile(cwd);
  if (config) {
    console.error("lage is already initialized in this workspace");
    process.exitCode = 1;
    return;
  }

  console.info("Installing lage and creating a default configuration file");

  let workspaceManager: WorkspaceManager = "yarn";

  try {
    workspaceManager = whichWorkspaceManager(cwd);
  } catch (e) {
    console.error(
      "lage requires you to be using a workspace - make sure you are using yarn workspaces, npm workspaces, pnpm workspaces, or rush"
    );
    process.exitCode = 1;
    return;
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
  fs.writeFileSync(lageConfigFile, "module.exports = " + JSON.stringify(lageConfig, null, 2) + ";");

  await installLage(cwd, workspaceManager, pipeline);

  console.info(`Lage is initialized! You can now run: ${getBuildCommand(workspaceManager)}`);
}

function getBuildCommand(workspaceManager: WorkspaceManager) {
  switch (workspaceManager) {
    case "yarn":
      return "yarn lage build";

    case "pnpm":
      return "pnpm run lage build";

    case "rush":
    case "npm":
      return "npm run lage build";
  }
}

function whichWorkspaceManager(cwd: string) {
  const packageJson = readPackageJson(cwd);

  if (fs.existsSync(path.join(cwd, "rush.json"))) {
    return "rush";
  }

  if (fs.existsSync(path.join(cwd, "yarn.lock")) && packageJson.workspaces) {
    return "yarn";
  }

  if (fs.existsSync(path.join(cwd, "pnpm-workspace.yaml"))) {
    return "pnpm";
  }

  if (fs.existsSync(path.join(cwd, "package-lock.json")) && packageJson.workspaces) {
    return "npm";
  }

  throw new Error("not a workspace");
}

async function installLage(cwd: string, workspaceManager: WorkspaceManager, pipeline: Record<string, string[]>) {
  const lageVersion = getLageVersion();
  const packageJson = readPackageJson(cwd);
  packageJson.scripts ??= {};
  for (const script of Object.keys(pipeline)) {
    packageJson.scripts[script] = `lage ${script}`;
  }

  if (workspaceManager === "rush") {
    packageJson.scripts.lage = `node common/scripts/install-run.js lage@${lageVersion} lage`;
    writePackageJson(cwd, packageJson);
  } else {
    packageJson.scripts.lage = "lage";
    packageJson.devDependencies ??= {};
    packageJson.devDependencies.lage = lageVersion;
    writePackageJson(cwd, packageJson);

    await execa(workspaceManager, ["install"], { stdio: "inherit", shell: true });
  }
}

function getLageVersion() {
  const lagePackageJsonFile = require.resolve("../../package.json", {
    paths: [__dirname],
  });
  const lagePackageJson = JSON.parse(fs.readFileSync(lagePackageJsonFile, "utf-8"));
  return lagePackageJson.version;
}

function writePackageJson(cwd: string, packageJson: any) {
  const packageJsonFile = path.join(cwd, "package.json");
  fs.writeFileSync(packageJsonFile, JSON.stringify(packageJson, null, 2));
}

function readPackageJson(cwd: string): {
  scripts?: Record<string, string>;
  devDependencies?: Record<string, string>;
  workspaces?: any;
} {
  const packageJsonFile = path.join(cwd, "package.json");
  return JSON.parse(fs.readFileSync(packageJsonFile, "utf-8"));
}
