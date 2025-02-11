import { execSync } from "child_process";

export function killDetachedProcess(pid: number | string) {
  const pidNumber = typeof pid === "string" ? parseInt(pid) : pid;
  try {
    if (process.platform !== "win32") {
      process.kill(pidNumber, "SIGTERM");
    } else {
      // on Windows get the process tree and kill the parent
      const tree = execSync(`wmic process where (ParentProcessId=${pidNumber}) get ProcessId`).toString();

      const pids = tree
        .split("\n")
        .map((line: string) => line.trim())
        .filter((line: string) => line !== "" && line !== "ProcessId");

      pids.forEach((p: string) => {
        process.kill(parseInt(p));
      });

      process.kill(pidNumber);
    }
  } catch (e) {
    // ignore
  }
}
