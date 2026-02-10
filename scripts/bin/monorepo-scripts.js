#!/usr/bin/env node
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const [command, ...spawnArgs] = process.argv.slice(2);

const commandPath = path.resolve(__dirname, `../commands/${command}.js`);
if (fs.existsSync(commandPath)) {
  const cp = spawn(process.execPath, [commandPath, ...spawnArgs], {
    stdio: "inherit",
  });
  cp.on("exit", (code) => {
    process.exitCode = code || 0;
  });
} else {
  console.error(`Command not found (under scripts/commands): ${command}`);
  process.exit(1);
}
