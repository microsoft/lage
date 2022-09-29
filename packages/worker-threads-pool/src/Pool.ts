import type { AbortSignal } from "abort-controller";

export interface Pool {
  exec(data: unknown, setup?: (args: any) => void, cleanup?: (args: any) => void, abortSignal?: AbortSignal): Promise<unknown>;
  close(): Promise<unknown>;
}
