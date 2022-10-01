import { Worker } from "node:worker_threads";
import { Readable } from "node:stream";

export interface Pool {
  exec(
    data: unknown,
    setup?: (worker?: Worker, stdout?: Readable, stderr?: Readable) => void,
    cleanup?: (args: any) => void
  ): Promise<unknown>;
  close(): Promise<unknown>;
}
