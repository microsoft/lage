import { startDaemon } from "./daemon.js";
import { getPackageInfosAsync } from "./client.js";

startDaemon(false);

(async () => {
  // await new Promise((resolve) => setTimeout(resolve, 1000));
  await getPackageInfosAsync();
})();

export { startDaemon };
