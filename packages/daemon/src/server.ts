import { createServer } from "net";
import createLogger from "@lage-run/logger";
import os from "os";

const server = createServer((socket) => {
  socket.on("data", (data) => {
    if (data.toString() === "getDir") {
      socket.write("dir");
    }
  });
});

const pipePath = process.env.PIPE_PATH ?? os.platform() === "win32" ? "\\\\.\\pipe\\my_pipe" : "/tmp/my_pipe";

const logger = createLogger();

server.listen(pipePath, () => {
  logger.info("Server is ready");
});
