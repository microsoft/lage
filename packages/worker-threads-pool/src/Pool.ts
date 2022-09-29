import type { AbortSignal } from "abort-controller";

export interface Pool {
  exec(data: unknown, setup?: (args: any) => void, cleanup?: (args: any) => void): Promise<unknown>;
  close(): Promise<unknown>;
}
