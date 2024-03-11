import os from "os";
import { type Socket, connect } from "net";

export function getDir() {
  // ensure client, use client to ask for dir from server
  const client = ensureClient();
  client.write("getDir");
  client.end();
}

let connection: Socket;
export function ensureClient() {
  if (!connection) {
    const pipePath = process.env.PIPE_PATH ?? os.platform() === "win32" ? "\\\\?\\pipe\\my_pipe" : "/tmp/my_pipe";
    connection = connect(pipePath);

    connection.on("data", (data) => {
      console.log(data.toString());
    });
  }

  return connection;
}
