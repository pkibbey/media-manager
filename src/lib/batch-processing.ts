/**
 * Process items in chunks with controlled concurrency
 *
 * @param items - Array of items to process
 * @param processFn - Function to process each item
 * @param concurrency - Number of items to process in parallel
 * @returns Array of results from the processing function
 */
export async function processInChunks<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  concurrency = 3,
): Promise<Array<PromiseSettledResult<R>>> {
  const results: Array<PromiseSettledResult<R>> = [];

  // Process in chunks of 'concurrency' size
  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    const chunkPromises = chunk.map(processFn);
    const chunkResults = await Promise.allSettled(chunkPromises);
    results.push(...chunkResults);
  }

  return results;
}
