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
 * Process items sequentially with memory management
 *
 * @param items - Array of items to process
 * @param processFn - Function to process each item
 * @param options - Options for sequential processing
 * @returns Object with processing results and statistics
 */
export async function processSequentially<
  T,
  R extends { success: boolean; processingTime?: number },
>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: {
    logMemory?: boolean;
    delayBetweenItems?: number;
    attemptGC?: boolean;
  } = {},
): Promise<{
  results: R[];
  succeeded: number;
  failed: number;
  total: number;
  totalProcessingTime: number;
}> {
  const {
    logMemory = true,
    delayBetweenItems = 200,
    attemptGC = true,
  } = options;

  let succeeded = 0;
  let failed = 0;
  let totalProcessingTime = 0;
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`Processing item ${i + 1}/${items.length}`);

    try {
      const result = await processFn(item);
      results.push(result);

      if (result.success) {
        succeeded++;
        totalProcessingTime += result.processingTime || 0;
      } else {
        failed++;
      }

      // Log memory usage after each item
      if (logMemory) {
        const currentMemory = process.memoryUsage();
        console.log(
          `Memory after item ${i + 1}: ${JSON.stringify({
            rss: `${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(currentMemory.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
          })}`,
        );
      }

      // Add a delay between processing to allow for GC
      if (delayBetweenItems > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenItems));
      }

      // Hint to the JavaScript engine to perform garbage collection
      if (attemptGC && global.gc) {
        try {
          global.gc();
          console.log('Garbage collection performed');
        } catch (_e) {
          console.log('Failed to perform garbage collection');
        }
      }
    } catch (error) {
      console.error(`Error processing item ${i + 1}:`, error);
      failed++;
    }
  }

  return {
    results,
    succeeded,
    failed,
    total: items.length,
    totalProcessingTime,
  };
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
