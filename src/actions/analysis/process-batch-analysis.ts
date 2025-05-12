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

    // Process each item
    const results = await Promise.allSettled(
      mediaItems.map((item) => processAnalysis(item.id)),
    );

    let totalBatchProcessingTime = 0;
    const succeeded = results.filter((r) => {
      if (r.status === 'fulfilled' && r.value.success) {
        totalBatchProcessingTime += r.value.processingTime || 0;
        return true;
      }
      return false;
    }).length;
    const failed = results.length - succeeded;

    return {
      success: true,
      processed: succeeded,
      failed,
      total: results.length,
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
