export const ComputeHashTask = "backfillHash";
export const CacheFetchTask = "backfillFetch";
export const CachePutTask = "backfillPut";

export function isCacheTask(task: string) {
  return (
    task === ComputeHashTask || task === CacheFetchTask || task === CachePutTask
  );
}
