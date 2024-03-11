import fs from "fs";
import execa from "execa";

export function startDaemon(replace: boolean) {
  const pidFile = "daemon.pid";
  if (fs.existsSync(pidFile)) {
    if (replace) {
      const pid = fs.readFileSync(pidFile, "utf-8").trim();
      try {
        process.kill(parseInt(pid, 10), "SIGKILL");
      } catch (e) {
        // ignore
      }
      fs.unlinkSync(pidFile);
    } else {
      return;
    }
  }

  const child = execa("node", ["lib/server.js"], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });

  if (child.pid) {
    fs.writeFileSync(pidFile, child.pid.toString());
  }

  child.unref();
}
