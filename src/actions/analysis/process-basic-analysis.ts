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

    // Process items sequentially
    const processFn = (item: (typeof mediaItems)[0]) => processForObjects(item);
    const processingResult = await processSequentially(mediaItems, processFn);

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
      failed: 0,
      total: 0,
      processed: 0,
    };
  }
}
