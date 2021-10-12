export const CacheHashTask = "backfillHash";
export const CacheFetchTask = "backfillFetch";
export const CachePutTask = "backfillPut";

export function isCacheTask(task: string) {
  return (
    task === CacheHashTask || task === CacheFetchTask || task === CachePutTask
  );
}
