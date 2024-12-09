import { type ConnectRouter } from "@connectrpc/connect";
import { LageService } from "./gen/lage/v1/lage_pb.js";
import { type ILageService } from "./types/ILageService.js";

export function createRoutes(serviceImpl: ILageService) {
  return (router: ConnectRouter) => {
    router.service(LageService, serviceImpl);
  };
}
