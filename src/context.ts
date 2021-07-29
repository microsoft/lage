import { Config } from "./types/Config";
import { RunContext } from "./types/RunContext";
import Profiler from "p-profiler";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";

export function createContext(
  config: Pick<Config, "concurrency" | "profile">
): RunContext {
  const { concurrency, profile } = config;

  const useCustomProfilePath = typeof profile === "string";

  const profilerOutputDir = useCustomProfilePath
    ? dirname(profile as string)
    : join(tmpdir(), "lage", "profiles");

  mkdirSync(profilerOutputDir, { recursive: true });

  const profiler = new Profiler(
    useCustomProfilePath
      ? {
          concurrency,
          customOutputPath: profile as string,
        }
      : {
          concurrency,
          prefix: "lage",
          outDir: profilerOutputDir,
        }
  );

  return {
    measures: {
      start: [0, 0],
      duration: [0, 0],
      failedTargets: [],
    },
    targets: new Map(),
    profiler,
  };
}
