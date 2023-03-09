const packagePath = process.cwd();
const path = require("path");
(async function main() {
  const { execa } = await import("execa");

  await execa("yarn", ["jest", `--config=${path.join(packagePath, "jest.config.js")}`, ...process.argv.slice(2)], {
    cwd: __dirname,
    stdio: "inherit",
  });
})().catch((error) => {
  process.exitCode = 1;
});
