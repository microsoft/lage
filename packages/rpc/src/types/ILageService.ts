import type { ServiceImpl } from "@connectrpc/connect";
import type { LageService } from "../gen/lage/v1/lage_connect.js";

export type ILageService = Partial<ServiceImpl<typeof LageService>>;
