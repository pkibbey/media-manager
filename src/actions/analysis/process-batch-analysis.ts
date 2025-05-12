'use server';

import { createSupabase } from '@/lib/supabase';
import { processAnalysis } from './process-analysis';

/**
 * Process analysis for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */

export async function processBatchAnalysis(limit: number) {
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
      .select('id')
      .eq('is_analysis_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return { success: true, processed: 0, message: 'No items to process' };
    }

    // Process items sequentially instead of in parallel
    // This helps manage memory better by not overloading
    let succeeded = 0;
    let failed = 0;
    let totalBatchProcessingTime = 0;

    for (let i = 0; i < mediaItems.length; i++) {
      const item = mediaItems[i];
      console.log(
        `Processing item ${i + 1}/${mediaItems.length} (ID: ${item.id})`,
      );

      try {
        const result = await processAnalysis(item.id);
        if (result.success) {
          succeeded++;
          totalBatchProcessingTime += result.processingTime || 0;
        } else {
          failed++;
        }

        // Log memory usage after each item
        const currentMemory = process.memoryUsage();
        console.log(
          `Memory after item ${i + 1}: ${JSON.stringify({
            rss: `${Math.round(currentMemory.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(currentMemory.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
          })}`,
        );

        // Add a small delay between processing to allow for GC
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Hint to the JavaScript engine to perform garbage collection
        if (global.gc) {
          try {
            global.gc();
            console.log('Garbage collection performed');
          } catch (_e) {
            console.log(
              'Failed to perform garbage collection - run with --expose-gc flag',
            );
          }
        }
      } catch (itemError) {
        console.error(`Error processing item ${item.id}:`, itemError);
        failed++;
      }
    }

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
      processed: succeeded,
      failed,
      total: mediaItems.length,
      batchProcessingTime: totalBatchProcessingTime,
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
