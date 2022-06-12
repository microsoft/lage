import { Config } from "./types/Config";
import { RunContext } from "./types/RunContext";
import Profiler from "p-profiler";
import { join, dirname } from "path";
import { tmpdir } from "os";
import { mkdirSync } from "fs";
import { WorkerQueue } from "./task/WorkerQueue";

export function createContext(
  config: Pick<
    Config,
    "concurrency" | "profile" | "dist" | "workerQueueOptions"
  >
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
    workerQueue: config.dist ? new WorkerQueue(config) : undefined,
  };
}
