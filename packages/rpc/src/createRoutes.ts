import { type ConnectRouter } from "@connectrpc/connect";
import { LageService } from "./gen/lage/v1/lage_connect.js";
import { type ILageService } from "./types/ILageService.js";

export function createRoutes(serviceImpl: ILageService) {
  return (router: ConnectRouter): void => {
    router.service(LageService, serviceImpl);
  };
}
