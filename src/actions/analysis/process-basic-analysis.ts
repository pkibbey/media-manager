'use server';

import { DEFAULT_CONCURRENCY } from '@/lib/consts';
import { createSupabase } from '@/lib/supabase';
import { clearModelCache, processBatchForObjects } from './process-for-objects';

// Number of items to process in parallel with the M3 GPU
// Adjust if experiencing memory issues

/**
 * Process analysis for multiple media items in batch
 *
 * @param limit - Maximum number of items to process
 * @returns Object with count of processed items and any errors
 */
export async function processBasicAnalysis(limit = 10) {
  try {
    const supabase = createSupabase();

    // Find media items that need analysis processing
    const { data: mediaItems, error: findError } = await supabase
      .from('media')
      .select(
        '*, thumbnail_data(*), analysis_data(*), exif_data(*), media_types(*)',
      )
      .eq('is_thumbnail_processed', true)
      .eq('is_basic_processed', false)
      .limit(limit);

    if (findError) {
      throw new Error(`Failed to find unprocessed items: ${findError.message}`);
    }

    if (!mediaItems || mediaItems.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        total: 0,
        message: 'No items to process',
      };
    }

    // Use optimized batch processing
    const batchResult = await processBatchForObjects(
      mediaItems,
      DEFAULT_CONCURRENCY,
    );

    return {
      success: batchResult.success,
      processed: batchResult.processedCount,
      failed: batchResult.failedCount,
      total: mediaItems.length,
      batchProcessingTime: batchResult.totalProcessingTime,
      message: `Processed ${batchResult.processedCount} items (${batchResult.failedCount} failed) in basic analysis`,
    };
  } catch (error) {
    console.error('Error in batch analysis processing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      failed: 0,
      total: 0,
      processed: 0,
      message: 'Basic analysis batch processing failed',
    };
  } finally {
    // Clean up memory after large batches
    if (limit > 50) {
      await clearModelCache();
    }
  }
}
