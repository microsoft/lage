import {
  spawn,
  SpawnOptionsWithStdioTuple,
  StdioNull,
} from "child_process";

export function spawnPromise(
  cmd: string,
  args: ReadonlyArray<string>,
  options: SpawnOptionsWithStdioTuple<StdioNull, StdioNull, StdioNull>
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cp = spawn(cmd, args, options);

    let errorHandled = false;

    cp.on("error", handleChildProcessError);
    cp.on("exit", handleChildProcessExit);

    function handleChildProcessExit(
      code: number,
      signal: NodeJS.Signals | null
    ) {
      if (code === 0 && !signal) {
        return resolve();
      }

      handleChildProcessError(new Error(`Process exited with code ${code}`));
    }

    function handleChildProcessError(err: Error) {
      if (!errorHandled) {
        errorHandled = true;
        reject(err);
      }
    }
  });
}
