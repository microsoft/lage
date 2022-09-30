import { Logger, LogLevel } from "@lage-run/logger";
import { getPackageAndTask } from "@lage-run/target-graph";
import { createInterface } from "readline";
import { EventEmitter } from "events";
import { Worker } from "worker_threads";
import { END_WORKER_STREAM_MARKER, START_WORKER_STREAM_MARKER } from "@lage-run/worker-threads-pool/src";

export const captureStreamsEvents = new EventEmitter();

export function captureWorkerStdioStreams(logger: Logger, worker: Worker) {
  const stdout = worker.stdout;
  const stdoutInterface = createInterface({
    input: stdout,
    crlfDelay: Infinity,
  });

  const stderr = worker.stderr;
  const stderrInterface = createInterface({
    input: stderr,
    crlfDelay: Infinity,
  });

  const lineHandlerFactory = (outputType: string) => {
    let targetId = "";
    let lines: string[] = [];

    return (line: string) => {
      if (line.includes(START_WORKER_STREAM_MARKER)) {
        targetId = line.replace(START_WORKER_STREAM_MARKER, "");
        lines = [];
        captureStreamsEvents.emit("start", outputType, targetId);
      } else if (line.includes(END_WORKER_STREAM_MARKER)) {
        targetId = line.replace(END_WORKER_STREAM_MARKER, "");
        captureStreamsEvents.emit("end", outputType, targetId, lines);
      } else {
        const { packageName, task } = getPackageAndTask(targetId);
        lines.push(line);
        logger.log(LogLevel.verbose, line, { target: { id: targetId, packageName, task } });
      }
    };
  };

  const stdoutLineHandler = lineHandlerFactory("stdout");
  const stderrLineHandler = lineHandlerFactory("stderr");

  stdoutInterface.on("line", stdoutLineHandler);
  stderrInterface.on("line", stderrLineHandler);
}
