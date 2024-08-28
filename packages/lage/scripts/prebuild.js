const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const runnersPath = path.dirname(require.resolve("@lage-run/runners/package.json"));
const cliPath = path.dirname(require.resolve("@lage-run/cli/package.json"));

const runnerDirs = [path.join(runnersPath, "lib"), path.join(cliPath, "lib", "commands", "cache", "runners")];

function prebuild() {
  // Due to the fact that workers require the runner to be in the same directory, we need to copy the runners to the dist folder

  for (const runnerDir of runnerDirs) {
    for (const runner of fs.readdirSync(runnerDir)) {
      // By convention, only copy things that end with "Runner.js"
      if (runner.endsWith("Runner.js")) {
        const src = path.join(runnerDir, runner);
        const dest = path.join(cwd, "dist", "runners", runner);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
      }
    }
  }
}

prebuild();
