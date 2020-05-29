import { Config } from "./types/Config";
import { EventEmitter } from "events";
import { RunContext } from "./types/RunContext";
import PQueue from "p-queue";
import Profiler from "p-profiler";

export function createContext(config: Pick<Config, "concurrency">): RunContext {
  const { concurrency } = config;

  return {
    measures: {
      start: [0, 0],
      duration: [0, 0],
      taskStats: [],
      failedTask: undefined,
    },
    profiler: new Profiler({
      concurrency,
      prefix: "lage",
      outDir: process.cwd(),
    }),
    taskLogs: new Map(),
    queue: new PQueue({ concurrency }),
    events: new EventEmitter(),
  };
}
