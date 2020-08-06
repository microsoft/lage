import { Config } from "./types/Config";
import { RunContext } from "./types/RunContext";
import Profiler from "p-profiler";
import { join } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";

export function createContext(config: Pick<Config, "concurrency">): RunContext {
  const { concurrency } = config;

  const profilerOutputDir = join(tmpdir(), "lage", "profiles");
  mkdirSync(profilerOutputDir, { recursive: true });

  return {
    measures: {
      start: [0, 0],
      duration: [0, 0],
      failedTask: undefined,
    },
    tasks: new Map(),
    profiler: new Profiler({
      concurrency,
      prefix: "lage",
      outDir: profilerOutputDir,
    }),
  };
}
