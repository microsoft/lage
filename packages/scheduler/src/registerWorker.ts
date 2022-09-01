import workerpool from "workerpool";

export function registerWorker(run: (...args: any[]) => any) {
  workerpool.worker({ run });
}
