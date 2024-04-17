#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

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
    shell: process.platform === "win32",
  });
}

cp.on("exit", (code) => {
  process.exitCode = code;
});

function findCommand(command) {
  // Try to find a command under monorepo-scripts/commands
  const commandPath = path.join(__dirname, "../commands", `${command}.js`);
  if (fs.existsSync(commandPath)) {
    return commandPath;
  }

  // Try to find command in package's own node_modules
  const packagePath = getPackagePath(process.cwd());
  const binPath = getBinPath(packagePath, command);
  if (binPath) {
    return binPath;
  }

  // Try to find command in scripts/ directory
  let scriptsPath = path.join(__dirname, "..");
  const root = path.parse(scriptsPath).root;
  while (scriptsPath !== root) {
    const binPath = getBinPath(scriptsPath, command);
    if (binPath) {
      return binPath;
    }
    scriptsPath = path.dirname(scriptsPath);
  }

  return undefined;
}

function getPackagePath(cwd) {
  const root = path.parse(cwd).root;
  while (cwd !== root) {
    const packagePath = path.join(cwd, "package.json");
    if (fs.existsSync(packagePath)) {
      return packagePath;
    }
    cwd = path.dirname(cwd);
  }

  return null;
}

function getBinPath(packagePath, command) {
  if (!packagePath || !command) {
    return undefined;
  }

  const binPath =
    os.platform() === "win32" ? `${packagePath}/node_modules/.bin/${command}.cmd` : `${packagePath}/node_modules/.bin/${command}`;

  if (fs.existsSync(binPath)) {
    return binPath;
  }

  return undefined;
}
