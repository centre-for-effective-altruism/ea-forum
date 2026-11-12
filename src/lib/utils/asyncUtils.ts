import chunk from "lodash/chunk";

export const sleep = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });

export const mapInBatches = async <T, R>(
  items: readonly T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  for (const batch of chunk(items, batchSize)) {
    results.push(...(await Promise.all(batch.map(fn))));
  }
  return results;
};
