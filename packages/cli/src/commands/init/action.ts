/* eslint-disable no-console -- logger doesn't work in this context */
import { readConfigFile } from "@lage-run/config";
import { getPackageInfo, getWorkspaceManagerAndRoot, type WorkspaceManager } from "workspace-tools";
import fs from "fs";
import path from "path";
import execa from "execa";

export async function initAction(): Promise<void> {
  const cwd = process.cwd();

  const managerAndRoot = getWorkspaceManagerAndRoot(cwd);
  if (!managerAndRoot) {
    console.error("lage only works with workspaces - make sure you are using yarn workspaces, npm workspaces, pnpm workspaces, or rush");
    process.exitCode = 1;
    return;
  }

  const { manager: workspaceManager, root } = managerAndRoot;
  const config = await readConfigFile(root);
  if (config) {
    console.error("lage is already initialized in this repo");
    process.exitCode = 1;
    return;
  }

  console.info("Installing lage and creating a default configuration file");

  const isMetaManager = workspaceManager === "rush" || workspaceManager === "lerna";
  const npmClientLine = isMetaManager ? "" : `npmClient: "${workspaceManager}",`;
  const lockFile = isMetaManager
    ? ""
    : workspaceManager === "yarn"
      ? "yarn.lock"
      : workspaceManager === "pnpm"
        ? "pnpm-lock.yaml"
        : "package-lock.json";

  const configContent = `// @ts-check
/** @type {import("lage").ConfigFileOptions} */
const config = {
  // Define your tasks and their dependencies here
  pipeline: {
    build: ["^build"],
    test: ["build"],
    lint: [],
  },
  ${npmClientLine}
  // Update these according to your repo's build setup
  cacheOptions: {
    // Generated files in each package that will be saved into the cache
    // (relative to package root; folders must end with **/*)
    outputGlob: ["lib/**/*"],
    // Changes to any of these files/globs will invalidate the cache (relative to repo root;
    // folders must end with **/*). This should include any repo-wide configs or scripts that
    // are outside a package but could invalidate previous output. Including the lock file is
    // optional--lage attempts to more granularly check resolved dependency changes, but this
    // isn't entirely reliable, especially for peerDependencies.
    environmentGlob: ${JSON.stringify(["package.json", lockFile, "lage.config.js"].filter(Boolean))},
  },
};
module.exports = config;
`;

  fs.writeFileSync(path.join(root, "lage.config.js"), configContent);

  await installLage(root, workspaceManager, ["build", "test", "lint"]);

  console.info(`Lage is initialized! You can now run: ${getBuildCommand(workspaceManager)}`);
}

function getBuildCommand(workspaceManager: WorkspaceManager) {
  switch (workspaceManager) {
    case "yarn":
      return "yarn lage build";

    case "pnpm":
      return "pnpm run lage build";

    default:
      return "npm run lage build";
  }
}

async function installLage(cwd: string, workspaceManager: WorkspaceManager, scripts: string[]) {
  const lageVersion = getLageVersion();
  const packageJson = readPackageJson(cwd);
  packageJson.scripts ??= {};
  for (const script of scripts) {
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
  // NOTE: this would give the wrong version prior to bundling of the `lage` package
  const lagePackageInfo = getPackageInfo(__dirname);
  if (!lagePackageInfo) {
    throw new Error("Could not find lage package root");
  }
  return lagePackageInfo.version;
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
