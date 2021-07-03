import { getWorkspace } from "../workspace/getWorkspace";
import { Config } from "../types/Config";
import { generateTopologicGraph } from "../workspace/generateTopologicalGraph";
import { createContext } from "../context";
import { Reporter } from "../logger/reporters/Reporter";
import { workerQueue } from "../task/workerQueue";
import { spawn } from "child_process";
import * as path from 'path';
import { findNpmClient } from "../workspace/findNpmClient";
import { TaskLogWritable } from "../logger/TaskLogWritable";
import { TaskLogger } from "../logger/TaskLogger";

// Run multiple
export async function worker(cwd: string, config: Config, reporters: Reporter[]) {
  const context = createContext(config);
  const workspace = getWorkspace(cwd, config);

  // generate topological graph
  const graph = generateTopologicGraph(workspace);

  workerQueue.process(1, (job, done) => {
    console.log(`processing job ${job.id}`);

    const {npmArgs, spawnOptions, packagePath} = job.data;
    const npmCmd = findNpmClient(config.npmClient);


    const cp = spawn(npmCmd, npmArgs, {
      cwd: path.join(cwd, packagePath),
      ...spawnOptions
    });

    const logger = new TaskLogger(job.data.packageName, job.data.task);

    const stdoutLogger = new TaskLogWritable(logger);
    cp.stdout.pipe(stdoutLogger);

    const stderrLogger = new TaskLogWritable(logger);
    cp.stderr.pipe(stderrLogger);

    cp.on("exit", done);
    
    // const stdoutLogger = new TaskLogWritable(this.logger);
    // cp.stdout.pipe(stdoutLogger);

    // const stderrLogger = new TaskLogWritable(this.logger);
    // cp.stderr.pipe(stderrLogger);

    // cp.on("exit", handleChildProcessExit);

    // function handleChildProcessExit(code: number) {
    //   if (code === 0) {
    //     NpmScriptTask.activeProcesses.delete(cp);
    //     return resolve();
    //   }

    //   cp.stdout.destroy();
    //   cp.stdin.destroy();
    //   reject();
    // }
  })
}
