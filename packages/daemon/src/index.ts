import { startDaemon } from "./daemon.js";
import { LageDaemonClient } from "./client.js";
import { getWorkspaceRoot } from "workspace-tools";
import FastGlob from "fast-glob";
import path from "path";

(async () => {
  const root = getWorkspaceRoot("d:/workspace/tmp1")!;
  const client = new LageDaemonClient(root);

  console.time("getPackageInfosAsync");
  await client.call("getPackageInfosAsync", [root]);
  console.timeEnd("getPackageInfosAsync");

  console.time("getPackageInfosAsync2");
  await client.call("getPackageInfosAsync", [root]);
  console.timeEnd("getPackageInfosAsync2");

  const files = await FastGlob(["packages/**/*.ts"], { ignore: ["**/node_modules/**"], cwd: root });
  console.time("hash");
  await client.call("hash", [files.slice(0, 1), { cwd: root }]);
  console.log(files);
  console.timeEnd("hash");

  client.close();
})();

export { startDaemon };
