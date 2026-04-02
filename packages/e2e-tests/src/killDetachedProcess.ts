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
      execSync(`taskkill /f /PID ${pidNumber} /T`, { stdio: "pipe" });
    }
  } catch (e: unknown) {
    // ESRCH means the process is already killed (works cross-platform)
    // On Windows, taskkill exits with code 128 when the process is not found
    const { code, status, stderr } = e as { code?: string | number; status?: number; stderr?: Buffer | string };
    if (code !== "ESRCH" && status !== 128) {
      const stderrStr = stderr instanceof Buffer ? stderr.toString("utf-8") : stderr;
      // eslint-disable-next-line no-console
      console.warn(`Failed to kill process ${pidNumber}: ${stderrStr || (e instanceof Error ? e.message : String(e))}`);
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
