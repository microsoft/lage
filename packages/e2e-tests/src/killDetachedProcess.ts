import { execSync } from "child_process";

export function killDetachedProcess(pid: number | string) {
  const pidNumber = typeof pid === "string" ? parseInt(pid) : pid;
  try {
    if (process.platform !== "win32") {
      process.kill(pidNumber, "SIGTERM");
    } else {
      // on Windows get the process tree and kill the parent
      execSync(`taskkill /f /PID ${pidNumber} /T`);
    }
  } catch (e) {
    // ignore
  }
}
