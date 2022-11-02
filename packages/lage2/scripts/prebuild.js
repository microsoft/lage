import fs from "fs";
import path from "path";
import { resolve } from "import-meta-resolve";
import { fileURLToPath } from "url";

const cwd = process.cwd();

async function prebuild() {
  const schedulerPath = path.dirname(path.dirname(fileURLToPath(await resolve("@lage-run/scheduler", import.meta.url))));
  const runners = fs.readdirSync(path.join(schedulerPath, "lib", "runners"));

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

prebuild().catch((e) => {
  console.error(e);
  process.exit(1);
});
