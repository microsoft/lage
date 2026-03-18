import { execSync } from "child_process";
import findProcess from "find-process";

/**
 * Kill the given process PID. If there's an error because the process is already dead,
 * it's ignored. Otherwise logs a warning on error.
 */
export function killDetachedProcess(pid: number | string): void {
  const pidNumber = typeof pid === "string" ? parseInt(pid) : pid;
  try {
    if (process.platform !== "win32") {
      process.kill(pidNumber, "SIGTERM");
    } else {
      // on Windows get the process tree and kill the parent
      execSync(`taskkill /f /PID ${pidNumber} /T`);
    }
  } catch (e) {
    // ESRCH means the process is already killed (works cross-platform)
    if ((e as { code?: string }).code !== "ESRCH") {
      // eslint-disable-next-line no-console
      console.warn(`Failed to kill process ${pidNumber}:`, e);
    }
  }
}

/**
 * Kill any processes listening on the given port.
 * @returns whether there were any processes
 */
export async function killProcessesOnPort(port: number): Promise<boolean> {
  const processes = await findProcess("port", port);
  for (const proc of processes) {
    killDetachedProcess(proc.pid);
  }
  return !!processes.length;
}
