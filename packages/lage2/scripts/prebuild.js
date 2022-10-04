const fs = require("fs");
const path = require("path");

const cwd = process.cwd();
const schedulerPath = path.dirname(require.resolve("@lage-run/scheduler/package.json"));

const runners = fs.readdirSync(path.join(schedulerPath, "lib", "runners"));

function prebuild() {
  fs.mkdirSync(path.join(schedulerPath, "runners"), { recursive: true });
  for (const runner of runners) {
    if (runner.endsWith("Runner.js")) {
      const src = path.join(schedulerPath, "lib", "runners", runner);
      const dest = path.join(cwd, "dist", "runners", runner);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

prebuild();
