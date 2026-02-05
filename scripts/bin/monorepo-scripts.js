#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const { findPackageRoot, findProjectRoot } = require("workspace-tools");

const projectRoot = findProjectRoot(process.cwd());

const [command, ...spawnArgs] = process.argv.slice(2);
const spawnCommand = findCommand(command);

let cp;
if (spawnCommand.endsWith(".js")) {
  console.log(`Running ${command} as: node ${spawnCommand} ${spawnArgs.join(" ")}`);
  cp = spawn(process.execPath, [spawnCommand, ...spawnArgs], {
    stdio: "inherit",
  });
} else {
  console.log(`Running ${command} as: ${spawnCommand} ${spawnArgs.join(" ")}`);
  cp = spawn(spawnCommand, spawnArgs, {
    stdio: "inherit",
    shell: true,
  });
}

cp.on("exit", (code) => {
  process.exitCode = code || 0;
});

function findCommand(/** @type {string} */ command) {
  // Try to find a command under monorepo-scripts/commands
  const commandPath = path.resolve(__dirname, "../commands", `${command}.js`);
  if (fs.existsSync(commandPath)) {
    return commandPath;
  }

  // Try to find command in package's own node_modules, then scripts/node_modules, then root node_modules
  for (const basePath of [findPackageRoot(process.cwd()), findPackageRoot(__dirname), projectRoot]) {
    if (basePath) {
      const binPath = getBinPath(basePath, command);
      if (binPath) {
        return binPath;
      }
    }
  }

  console.error("Could not find command: " + command);
  process.exit(1);
}

function getBinPath(/** @type {string | undefined} */ packagePath, /** @type {string | undefined} */ command) {
  if (!packagePath || !command) {
    return undefined;
  }

  const binPath = path.join(packagePath, "node_modules/.bin", process.platform === "win32" ? `${command}.cmd` : command);

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  return undefined;
}
