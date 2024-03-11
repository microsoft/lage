import os from "os";
import { type Socket, connect } from "net";

export function getDir() {
  // ensure client, use client to ask for dir from server
  const client = ensureClient();
  client.write("getDir");
  client.end();
}

export async function getPackageInfosAsync() {
  // ensure client, use client to ask for package infos from server
  const client = ensureClient();
  client.write("getPackageInfos");
  client.on("data", (data) => {
    console.log(data.toString());
  });
  client.end();
}

export function ensureClient() {
  const pipePath = process.env.PIPE_PATH ?? os.platform() === "win32" ? "\\\\?\\pipe\\my_pipe" : "/tmp/my_pipe";
  return connect(pipePath);
}
