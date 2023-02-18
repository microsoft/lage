type PromiseFn = () => Promise<unknown>;

export async function chunkPromise(promises: (Promise<unknown> | PromiseFn)[], limit = 5) {
  const chunk: (Promise<unknown> | PromiseFn)[] = [];
  const lastPromise = promises[promises.length - 1];

  for (const promise of promises) {
    chunk.push(promise);
    const chunkCount = chunk.length;

    if (chunkCount % limit === 0 || promise === lastPromise) {
      await Promise.all(chunk.map((p) => (typeof p === "function" ? p() : p)));
      chunk.splice(0, chunk.length);
    }
  }
}
