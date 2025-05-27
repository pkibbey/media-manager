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

/**
 * Count succeeded and failed results from Promise.allSettled
 *
 * @param results - Results from Promise.allSettled
 * @param successPredicate - Optional function to determine if a fulfilled result is successful
 * @returns Object with counts of succeeded and failed results
 */
export function countResults<T>(
  results: Array<PromiseSettledResult<T>>,
  successPredicate?: (value: T) => boolean,
): { succeeded: number; failed: number; total: number } {
  let succeeded = 0;

  if (successPredicate) {
    succeeded = results.filter(
      (r) => r.status === 'fulfilled' && successPredicate(r.value),
    ).length;
  } else {
    succeeded = results.filter((r) => r.status === 'fulfilled').length;
  }

  const failed = results.length - succeeded;

  return {
    succeeded,
    failed,
    total: results.length,
  };
}
