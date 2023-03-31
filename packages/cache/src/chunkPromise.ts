type PromiseFn = () => Promise<unknown>;

export async function chunkPromise(promises: (Promise<unknown> | PromiseFn)[], limit = 5) {
  for (let i = 0; i < promises.length; i += limit) {
    await Promise.all(promises.slice(i, i + limit).map((p) => (typeof p === "function" ? p() : p)));
  }
}
