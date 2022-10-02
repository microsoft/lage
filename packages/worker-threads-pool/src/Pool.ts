import type { Worker } from "worker_threads";
import type { Readable } from "stream";

export interface Pool {
  exec(
    data: unknown,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void
  ): Promise<unknown>;
  close(): Promise<unknown>;
}
