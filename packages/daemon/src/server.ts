import { createServer } from "net";
import createLogger from "@lage-run/logger";
import os from "os";

import { getPackageInfosAsync, getWorkspaceRoot } from "workspace-tools";

const server = createServer((socket) => {
  const root = getWorkspaceRoot(process.cwd())!;

  let getPackageInfoAyncCache: any = null;

  socket.on("data", async (data) => {
    if (data.toString() === "getDir") {
      socket.write("dir");
    } else if (data.toString() === "getPackageInfos") {
      if (!getPackageInfoAyncCache) {
        getPackageInfoAyncCache = await getPackageInfosAsync(root);
      }

      socket.write(JSON.stringify(getPackageInfoAyncCache));
    }
  });
});

const pipePath = process.env.PIPE_PATH ?? os.platform() === "win32" ? "\\\\.\\pipe\\my_pipe" : "/tmp/my_pipe";

const logger = createLogger();

server.listen(pipePath, () => {
  logger.info("Server is ready");
});
