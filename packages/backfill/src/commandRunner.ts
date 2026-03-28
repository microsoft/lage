import execa from "execa";
import fs from "fs-extra";
import { globUncached } from "@lage-run/globby";

import type { Logger } from "backfill-logger";

export type ExecaReturns = execa.ExecaChildProcess;
export type BuildCommand = () => Promise<ExecaReturns | void>;

export function getRawBuildCommand(): string {
  return process.argv.slice(2).join(" ");
}

export function createBuildCommand(
  buildCommand: (string | number)[],
  clearOutput: boolean,
  outputGlob: string[],
  logger: Logger
): () => Promise<ExecaReturns | void> {
  return async (): Promise<ExecaReturns | void> => {
    const parsedBuildCommand = buildCommand.join(" ");

    if (!parsedBuildCommand) {
      throw new Error("Command not provided");
    }

    if (clearOutput) {
      const filesToClear = globUncached(outputGlob);
      await Promise.all(
        filesToClear.map(async (file) => await fs.remove(file))
      );
    }

    try {
      // Set up runner
      const tracer = logger.setTime("buildTime");
      const runner = execa(parsedBuildCommand, {
        shell: true,
      });

      logger.pipeProcessOutput(runner.stdout, runner.stderr);

      await runner;
      tracer.stop();
    } catch (e) {
      logger.error(`Failed while running: "${parsedBuildCommand}"`);
      throw e;
    }
  };
}
