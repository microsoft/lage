import { type ConnectRouter } from "@connectrpc/connect";
import { TargetRunnerService } from "./gen/lage/v1/lage_connect.js";

export default function (router: ConnectRouter) {
  // implement rpc Say(SayRequest) returns (SayResponse)
  router.service(TargetRunnerService, {
    async runTarget(req) {
      return {
        packageName: "packageName",
        task: req.task,
        stdout: "stdout",
        stderr: "stderr",
        exitCode: 0,
      };
    },
  });
}
