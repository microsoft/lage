import path from "path";
import fs from "fs";
import { getStartTargetId } from "@lage-run/target-graph";
import { NoOpRunner } from "./NoOpRunner.js";
import type { Target } from "@lage-run/target-graph";
import type { TargetRunner } from "@lage-run/scheduler-types";

export interface TargetRunnerPickerOptions {
  [key: string]: { script: string; options: any };
}

export class TargetRunnerPicker {
  constructor(private options: TargetRunnerPickerOptions) {}

  async pick(target: Target): Promise<TargetRunner> {
    if (target.id === getStartTargetId()) {
      return NoOpRunner;
    }

    if (!target.type) {
      target.type = "npmScript";
    }

    if (this.options[target.type]) {
      const config = this.options[target.type];
      const { script, options } = config;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const runnerModule = await tryLoadModule(script);

      if (!runnerModule) {
        throw new Error(`No runner found for target ${target.id}`);
      }

      const base = path.basename(script);
      const runnerName = base.replace(path.extname(base), "");

      const runner =
        typeof runnerModule[runnerName] === "function"
          ? runnerModule[runnerName]
          : runnerModule.default === "function"
          ? runnerModule.default
          : runnerModule;

      return new runner(options);
    }

    throw new Error(`No runner found for target ${target.id}`);
  }
}

/** read the closest package.json */
function findPackageJson(script: string) {
  const dir = path.dirname(script);
  const packageJsonPath = path.join(dir, "package.json");

  if (fs.existsSync(packageJsonPath)) {
    return packageJsonPath;
  } else if (dir === path.dirname(dir)) {
    return null;
  } else {
    return findPackageJson(dir);
  }
}

async function tryLoadModule(script: string): Promise<any> {
  // read the closest package.json
  const packageJsonPath = findPackageJson(script);
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const moduleType = packageJson.type ?? "script";

  const loadStrategy = {
    ".js": moduleType === "module" ? ["esm", "cjs"] : ["cjs", "esm"],
    ".mjs": ["esm"],
    ".cjs": ["cjs"],
    "": moduleType === "module" ? ["mjs"] : ["cjs"],
  };

  for (const [ext, strategies] of Object.entries(loadStrategy)) {
    let importScript = script;

    if (ext === "") {
      importScript = script + ".js";
    }

    if (fs.existsSync(importScript)) {
      for (const strategy of strategies) {
        if (strategy === "esm") {
          return await import(importScript);
        } else if (strategy === "cjs") {
          return require(importScript);
        }
      }
    }
  }
}
