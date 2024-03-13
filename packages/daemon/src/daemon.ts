import fs from "fs";
import execa from "execa";
import { getWorkspaceRoot } from "workspace-tools";
import path from "path";

export function startDaemon(replace: boolean) {
  const pidFile = "daemon.pid";

  if (fs.existsSync(pidFile)) {
    console.log("Daemon PID file found");
    if (replace) {
      const pid = fs.readFileSync(pidFile, "utf-8").trim();
      try {
        console.log("Killing daemon process PID: ", pid);
        process.kill(parseInt(pid, 10), "SIGKILL");
      } catch (e) {
        if (e instanceof Error) {
          console.log("Error killing daemon process: ", e.message);
        }
        // ignore
      }
      fs.unlinkSync(pidFile);
    } else {
      return;
    }
  }

  const root = path.resolve(getWorkspaceRoot(process.cwd())!);

  const child = execa("node", ["lib/server.js", "--root", root], {
    detached: true,
    stdio: "inherit",
    windowsHide: true,
  });

  if (child.pid) {
    fs.writeFileSync(pidFile, child.pid.toString());
  }

  child.unref();
}
