import type { Worker } from "worker_threads";
import type { Readable } from "stream";
import type { AbortSignal } from "abort-controller";

export interface Pool {
  exec(
    data: unknown,
    setup?: (worker: Worker, stdout: Readable, stderr: Readable) => void,
    cleanup?: (args: any) => void,
    abortSignal?: AbortSignal
  ): Promise<unknown>;
  close(): Promise<unknown>;
}
