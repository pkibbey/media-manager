'use server';

import { processSequentially } from '@/lib/batch-processing';
import { createSupabase } from '@/lib/supabase';
import { processForObjects } from './process-for-objects';

/**
 * Process analysis for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBasicAnalysis(limit = 10) {
  try {
    const supabase = createSupabase();

    // Log initial memory usage
    const initialMemory = process.memoryUsage();
    console.log(
      `Initial memory usage: ${JSON.stringify({
        rss: `${Math.round(initialMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(initialMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
      })}`,
    );

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select('*')
      .eq('is_thumbnail_processed', true)
      .eq('is_basic_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process items sequentially with memory management using our utility
    const processFn = (item: (typeof mediaItems)[0]) =>
      processForObjects(item.id);
    const processingResult = await processSequentially(mediaItems, processFn, {
      logMemory: true,
      delayBetweenItems: 200,
      attemptGC: true,
    });

    // Log final memory usage
    const finalMemory = process.memoryUsage();
    console.log(
      `Final memory usage: ${JSON.stringify({
        rss: `${Math.round(finalMemory.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(finalMemory.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
      })}`,
    );

    return {
      success: true,
      processed: processingResult.succeeded,
      failed: processingResult.failed,
      total: processingResult.total,
      batchProcessingTime: processingResult.totalProcessingTime,
    };
  } catch (error) {
    console.error('Error in batch analysis processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processed: 0,
    };
  }
}
